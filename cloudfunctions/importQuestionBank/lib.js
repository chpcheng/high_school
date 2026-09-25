// lib.js —— 题库拉取的纯逻辑（不依赖 wx-server-sdk，可本地单测）
// 包含：HTTP 拉取（含重试）、数据提取、题目校验、文档组装、分批等
const https = require('https');
const http = require('http');

// 默认配置
const DEFAULT_CONFIG = {
  maxRetries: 3,           // HTTP 请求最大重试次数
  baseRetryDelayMs: 1000,  // 首次重试延迟（指数退避：1s、2s、4s）
  requestTimeoutMs: 10000, // 单次 HTTP 请求超时
  batchSize: 50            // 写入分批大小（每批 sourceId 去重查询 < 100，安全）
};

const QUESTION_TYPES = ['single', 'multiple', 'fill', 'solution'];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 用 Node 内置 http/https 模块发起 GET 请求（零额外依赖）
function httpGet(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const mod = url.indexOf('https') === 0 ? https : http;
    const req = mod.get(url, { timeout: timeoutMs }, res => {
      // 跟随重定向（仅绝对 URL）
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(httpGet(res.headers.location, timeoutMs));
        res.resume();
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error('HTTP 状态码 ' + res.statusCode));
        res.resume();
        return;
      }
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => resolve(raw));
    });
    req.on('timeout', () => req.destroy(new Error('请求超时')));
    req.on('error', reject);
  });
}

// 带指数退避重试的拉取
async function fetchWithRetry(url, config = DEFAULT_CONFIG) {
  const maxRetries = config.maxRetries;
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = await httpGet(url, config.requestTimeoutMs);
      return JSON.parse(raw);
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const delay = config.baseRetryDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  throw new Error('数据源拉取失败（已重试 ' + maxRetries + ' 次）：' + (lastErr && lastErr.message));
}

// 从拉取结果中提取题目数组（兼容多种包装结构）
function extractQuestions(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.questions)) return payload.questions;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.list)) return payload.list;
  return null;
}

// 校验单条题目，返回 { ok, error }
function validateQuestion(q, index) {
  const label = q && q.id ? q.id : ('第 ' + (index + 1) + ' 条');
  if (!q || typeof q !== 'object') return { ok: false, error: label + '：不是对象' };
  if (!q.stem || typeof q.stem !== 'string' || !q.stem.trim()) return { ok: false, error: label + '：缺题干 stem' };
  if (!q.subject || !q.knowledgePoint) return { ok: false, error: label + '：缺 subject 或 knowledgePoint' };
  const type = q.type;
  if (QUESTION_TYPES.indexOf(type) < 0) return { ok: false, error: label + '：非法题型 type=' + type };
  if ((type === 'single' || type === 'multiple') && (!Array.isArray(q.options) || !q.options.length)) {
    return { ok: false, error: label + '：选择题缺 options' };
  }
  if (!q.answer || typeof q.answer !== 'object') return { ok: false, error: label + '：缺 answer' };
  if (type === 'single' || type === 'multiple') {
    if (!Array.isArray(q.answer.keys) || !q.answer.keys.length) return { ok: false, error: label + '：选择题缺 answer.keys' };
  }
  if (type === 'fill' && !Array.isArray(q.answer.blanks)) return { ok: false, error: label + '：填空题缺 answer.blanks' };
  if (type === 'solution' && !q.answer.reference) return { ok: false, error: label + '：解答题缺 answer.reference' };
  return { ok: true };
}

// 组装写入 questions 集合的文档
function buildQuestionDoc(q, ctx) {
  const { subjectMap, kpMap, sourceName } = ctx;
  const subjectId = subjectMap[q.subject];
  const kpId = kpMap[subjectId + '|' + q.knowledgePoint];
  return {
    subjectId,
    knowledgePointId: kpId,
    difficulty: Number(q.difficulty) || 1,
    type: q.type,
    stem: q.stem,
    stemImage: q.stemImage || '',
    options: q.options || [],
    answer: q.answer,
    analysis: q.analysis || '',
    steps: q.steps || [],
    tags: q.tags || [],
    source: q.source || sourceName,
    sourceId: q.id || '',
    status: 'published',
    createdBy: 'importQuestionBank'
  };
}

// 数组分块
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

module.exports = {
  DEFAULT_CONFIG,
  sleep,
  httpGet,
  fetchWithRetry,
  extractQuestions,
  validateQuestion,
  buildQuestionDoc,
  chunk
};
