// test-import-logic.js —— importQuestionBank 云函数纯逻辑本地单测
// 用 Node 内置 http 起本地服务，验证：拉取、重试、提取、校验、组装、分批
// 运行：node scripts/test-import-logic.js
const http = require('http');
const lib = require('../cloudfunctions/importQuestionBank/lib');
const mockSource = require('../cloudfunctions/importQuestionBank/mockSource');

let passed = 0, failed = 0;
function assert(name, cond, extra) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name + (extra ? ' — ' + JSON.stringify(extra) : '')); }
}

// 起一个本地 HTTP 服务，返回指定 JSON
function startServer(handler) {
  return new Promise(resolve => {
    const server = http.createServer(handler);
    server.listen(0, () => resolve(server));
  });
}

(async () => {
  console.log('== 1. extractQuestions 提取逻辑 ==');
  assert('直接数组', lib.extractQuestions([{ a: 1 }]).length === 1);
  assert('questions 字段', lib.extractQuestions({ questions: [1, 2] }).length === 2);
  assert('data 字段', lib.extractQuestions({ data: [1] }).length === 1);
  assert('list 字段', lib.extractQuestions({ list: [1, 2, 3] }).length === 3);
  assert('无法识别返回 null', lib.extractQuestions({ foo: 'bar' }) === null);
  assert('mockSource 可提取', lib.extractQuestions(mockSource).length === 7);

  console.log('== 2. validateQuestion 校验逻辑 ==');
  const okQ = mockSource.questions[0];
  assert('合法单选题通过', lib.validateQuestion(okQ, 0).ok === true);
  assert('缺 stem 拦截', lib.validateQuestion({ id: 'x', subject: '数学', knowledgePoint: 'a', type: 'single', options: [], answer: { keys: ['A'] } }, 0).ok === false);
  assert('非法题型拦截', lib.validateQuestion({ id: 'x', stem: 's', subject: '数学', knowledgePoint: 'a', type: 'weird' }, 0).ok === false);
  assert('选择题缺 options 拦截', lib.validateQuestion({ id: 'x', stem: 's', subject: '数学', knowledgePoint: 'a', type: 'single', answer: { keys: ['A'] } }, 0).ok === false);
  assert('解答题缺 reference 拦截', lib.validateQuestion({ id: 'x', stem: 's', subject: '数学', knowledgePoint: 'a', type: 'solution', answer: {} }, 0).ok === false);
  // mockSource 全部 7 题都应通过
  const allValid = mockSource.questions.every((q, i) => lib.validateQuestion(q, i).ok);
  assert('mockSource 7 题全部合法', allValid);

  console.log('== 3. buildQuestionDoc 组装逻辑 ==');
  const subjectMap = { '数学': 'subj-math' };
  const kpMap = { 'subj-math|二次函数': 'kp-1' };
  const doc = lib.buildQuestionDoc(okQ, { subjectMap, kpMap, sourceName: 'mock' });
  assert('subjectId 映射正确', doc.subjectId === 'subj-math');
  assert('knowledgePointId 映射正确', doc.knowledgePointId === 'kp-1');
  assert('sourceId 写入', doc.sourceId === 'mock-math-001');
  assert('source 写入', doc.source === 'mock');
  assert('status 为 published', doc.status === 'published');

  console.log('== 4. chunk 分批逻辑 ==');
  assert('分批 50', lib.chunk([1, 2, 3, 4, 5], 2).length === 3);
  assert('空数组', lib.chunk([], 2).length === 0);

  console.log('== 5. fetchWithRetry 拉取 + 重试机制 ==');
  // 5a. 正常返回
  const srv1 = await startServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ questions: [{ id: 'a' }] }));
  });
  const url1 = 'http://127.0.0.1:' + srv1.address().port + '/ok';
  const r1 = await lib.fetchWithRetry(url1, { ...lib.DEFAULT_CONFIG, requestTimeoutMs: 3000 });
  assert('正常拉取成功', r1.questions && r1.questions.length === 1);
  srv1.close();

  // 5b. 前两次失败、第三次成功（重试生效）
  let hits = 0;
  const srv2 = await startServer((req, res) => {
    hits++;
    if (hits < 3) { res.writeHead(500); res.end('err'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([{ id: 'b' }]));
  });
  const url2 = 'http://127.0.0.1:' + srv2.address().port + '/retry';
  const t0 = Date.now();
  const r2 = await lib.fetchWithRetry(url2, { maxRetries: 3, baseRetryDelayMs: 100, requestTimeoutMs: 3000 });
  const elapsed = Date.now() - t0;
  assert('重试后成功（共 3 次请求）', hits === 3 && r2.length === 1);
  assert('存在退避延迟（>=200ms）', elapsed >= 200, { elapsed });
  srv2.close();

  // 5c. 全部失败则抛错
  const srv3 = await startServer((req, res) => { res.writeHead(404); res.end('nf'); });
  const url3 = 'http://127.0.0.1:' + srv3.address().port + '/fail';
  let threw = false;
  try {
    await lib.fetchWithRetry(url3, { maxRetries: 2, baseRetryDelayMs: 10, requestTimeoutMs: 3000 });
  } catch (e) { threw = true; }
  assert('全部失败抛错', threw === true);
  srv3.close();

  console.log('\n===== 结果: ' + passed + ' 通过, ' + failed + ' 失败 =====');
  process.exit(failed > 0 ? 1 : 0);
})().catch(err => {
  console.error('测试运行异常:', err);
  process.exit(1);
});
