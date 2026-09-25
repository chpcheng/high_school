// 云函数：importQuestionBank —— 从数据源拉取题库并写入云数据库
//
// 触发方式（三种均可）：
//   1) 云开发控制台「云端测试」手动触发（参数可留空，走内置示例数据源）
//   2) 小程序端 wx.cloud.callFunction({ name: 'importQuestionBank', data: {...} })
//   3) 配置定时触发器（见 config.json 中 triggers 注释说明）定期自动拉取
//
// 入参 event（均可选）：
//   {
//     sourceUrl?: string,   // 数据源 HTTPS/HTTP 地址；不传则使用内置示例数据源(mockSource.js)
//     sourceName?: string,  // 数据源标识，写入 questions.source 字段，便于多源区分（默认 mock 或 http）
//     dryRun?: boolean      // true 时只拉取+校验、不写库（用于预览数据源内容）
//   }
//
// 返回：
//   {
//     ok, source, total, valid, invalid, inserted, skipped, failed,
//     createdSubjects, createdKnowledgePoints, errors, failedList
//   }
const cloud = require('wx-server-sdk');
const lib = require('./lib');
const mockSource = require('./mockSource');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 确保学科存在，返回 name -> _id（缺失则创建）
async function ensureSubjects(names) {
  const map = {};
  if (!names.length) return map;
  const res = await db.collection('subjects').where({ name: _.in(names) }).get();
  res.data.forEach(s => { map[s.name] = s._id; });
  for (const name of names) {
    if (map[name]) continue;
    const addRes = await db.collection('subjects').add({
      data: { name, icon: '', color: '#4A6CF7', order: 99 }
    });
    map[name] = addRes._id;
  }
  return map;
}

// 确保知识点存在，返回 "subjectId|name" -> _id（缺失则创建）
// key 形如 "<subjectId>|<name>"，subjectId 中不含 "|"，故用 indexOf 切第一个分隔符
async function ensureKnowledgePoints(keys) {
  const map = {};
  if (!keys.length) return map;
  const names = [...new Set(keys.map(k => {
    const i = k.indexOf('|');
    return k.slice(i + 1);
  }))];
  const res = await db.collection('knowledge_points').where({ name: _.in(names) }).get();
  const existing = {};
  res.data.forEach(p => { existing[p.subjectId + '|' + p.name] = p._id; });
  for (const key of keys) {
    if (existing[key]) { map[key] = existing[key]; continue; }
    const i = key.indexOf('|');
    const subjectId = key.slice(0, i);
    const name = key.slice(i + 1);
    const addRes = await db.collection('knowledge_points').add({
      data: { subjectId, name, parentId: '', order: 99 }
    });
    map[key] = addRes._id;
  }
  return map;
}

exports.main = async (event = {}) => {
  const sourceUrl = event.sourceUrl || '';
  const sourceName = event.sourceName || (sourceUrl ? 'http' : 'mock');
  const dryRun = !!event.dryRun;
  const batchSize = lib.DEFAULT_CONFIG.batchSize;

  // 1) 拉取数据源
  let payload;
  let usedMock = false;
  if (sourceUrl) {
    payload = await lib.fetchWithRetry(sourceUrl);
  } else {
    payload = mockSource;
    usedMock = true;
  }

  // 2) 提取题目
  const questions = lib.extractQuestions(payload);
  if (!questions) {
    throw new Error('数据源格式无法识别：应为题目数组，或包含 questions/data/list 数组字段的对象');
  }

  // 3) 逐条校验
  const valid = [];
  const errors = [];
  questions.forEach((q, i) => {
    const r = lib.validateQuestion(q, i);
    if (r.ok) valid.push(q);
    else errors.push({ index: i, error: r.error });
  });

  // 4) 学科/知识点名 → id 映射（缺失则创建）
  const subjectNames = [...new Set(valid.map(q => q.subject))];
  const subjectMap = await ensureSubjects(subjectNames);

  const kpKeys = new Set();
  valid.forEach(q => {
    const sid = subjectMap[q.subject];
    if (sid) kpKeys.add(sid + '|' + q.knowledgePoint);
  });
  const kpMap = await ensureKnowledgePoints([...kpKeys]);

  // 5) 组装待写入文档
  const docs = valid.map(q => lib.buildQuestionDoc(q, { subjectMap, kpMap, sourceName }));

  // dryRun：仅预览，不写库
  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      source: usedMock ? 'mock' : sourceUrl,
      total: questions.length,
      valid: valid.length,
      invalid: errors.length,
      errors: errors.slice(0, 20)
    };
  }

  // 6) 分批幂等写入（按 sourceId 去重，重复题目跳过）
  let inserted = 0, skipped = 0, failed = 0;
  const failedList = [];
  const batches = lib.chunk(docs, batchSize);
  for (const batch of batches) {
    const sourceIds = batch.map(d => d.sourceId).filter(Boolean);
    const existingSet = new Set();
    if (sourceIds.length) {
      const existRes = await db.collection('questions')
        .where({ sourceId: _.in(sourceIds) })
        .field({ sourceId: true })
        .get();
      existRes.data.forEach(d => existingSet.add(d.sourceId));
    }
    for (const doc of batch) {
      if (doc.sourceId && existingSet.has(doc.sourceId)) {
        skipped++;
        continue;
      }
      try {
        const data = { ...doc, createdAt: db.serverDate() };
        await db.collection('questions').add({ data });
        inserted++;
      } catch (err) {
        failed++;
        failedList.push({ id: doc.sourceId, error: err && err.message });
      }
    }
  }

  return {
    ok: true,
    source: usedMock ? 'mock' : sourceUrl,
    total: questions.length,
    valid: valid.length,
    invalid: errors.length,
    inserted,
    skipped,
    failed,
    createdSubjects: subjectNames.length,
    createdKnowledgePoints: kpKeys.size,
    errors: errors.slice(0, 20),
    failedList: failedList.slice(0, 20)
  };
};
