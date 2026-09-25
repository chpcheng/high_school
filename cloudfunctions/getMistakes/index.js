// 云函数：getMistakes —— 分页查询错题本（联表补全题目/学科/知识点名称）
// 入参：{ subjectId?, status?, skip?, limit? }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const cond = { userId: OPENID };
  if (event.status && event.status !== 'all') cond.status = event.status;
  if (event.subjectId) cond.subjectId = event.subjectId;

  const res = await db.collection('mistake_book')
    .where(cond)
    .orderBy('lastWrongAt', 'desc')
    .skip(event.skip || 0)
    .limit(event.limit || 20)
    .get();

  const list = res.data;
  if (!list.length) return [];

  const qIds = [...new Set(list.map(x => x.questionId))];
  const sIds = [...new Set(list.map(x => x.subjectId).filter(Boolean))];
  const kIds = [...new Set(list.map(x => x.knowledgePointId).filter(Boolean))];

  const qMap = {}, sMap = {}, kMap = {};
  if (qIds.length) {
    const qr = await db.collection('questions')
      .where({ _id: _.in(qIds) })
      .field({ stem: true, type: true, difficulty: true })
      .get();
    qr.data.forEach(q => { qMap[q._id] = q; });
  }
  if (sIds.length) {
    const sr = await db.collection('subjects').where({ _id: _.in(sIds) }).get();
    sr.data.forEach(s => { sMap[s._id] = s; });
  }
  if (kIds.length) {
    const kr = await db.collection('knowledge_points').where({ _id: _.in(kIds) }).get();
    kr.data.forEach(k => { kMap[k._id] = k; });
  }

  return list.map(m => ({
    _id: m._id,
    questionId: m.questionId,
    wrongCount: m.wrongCount,
    status: m.status,
    note: m.note,
    lastWrongAt: m.lastWrongAt,
    stem: (qMap[m.questionId] || {}).stem || '',
    type: (qMap[m.questionId] || {}).type || '',
    difficulty: (qMap[m.questionId] || {}).difficulty || 0,
    subjectName: (sMap[m.subjectId] || {}).name || '',
    knowledgePointName: (kMap[m.knowledgePointId] || {}).name || ''
  }));
};
