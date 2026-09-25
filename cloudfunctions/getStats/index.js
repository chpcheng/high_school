// 云函数：getStats —— 聚合知识点掌握度统计与薄弱点
// 返回：{ summary, bySubject, points }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const res = await db.collection('mastery').where({ userId: OPENID }).get();
  const list = res.data;

  let totalPractice = 0, totalCorrect = 0, masteredPoints = 0, weakPoints = 0;
  const subjMap = {};

  list.forEach(m => {
    const total = m.totalCount || 0;
    const correct = m.correctCount || 0;
    totalPractice += total;
    totalCorrect += correct;
    const rate = m.masteryRate != null ? m.masteryRate : (total ? correct / total : null);
    if (rate != null && rate >= 0.8) masteredPoints++;
    if (rate == null || rate < 0.6 || total < 3) weakPoints++;

    if (!subjMap[m.subjectId]) {
      subjMap[m.subjectId] = { subjectId: m.subjectId, totalCount: 0, correctCount: 0 };
    }
    subjMap[m.subjectId].totalCount += total;
    subjMap[m.subjectId].correctCount += correct;
  });

  const bySubject = Object.values(subjMap).map(s => ({
    ...s,
    masteryRate: s.totalCount ? s.correctCount / s.totalCount : 0
  }));

  const sIds = Object.keys(subjMap);
  const kIds = [...new Set(list.map(m => m.knowledgePointId))];
  const sNameMap = {}, kNameMap = {};

  if (sIds.length) {
    const sr = await db.collection('subjects').where({ _id: _.in(sIds) }).get();
    sr.data.forEach(s => { sNameMap[s._id] = s.name; });
  }
  if (kIds.length) {
    const kr = await db.collection('knowledge_points').where({ _id: _.in(kIds) }).get();
    kr.data.forEach(k => { kNameMap[k._id] = k.name; });
  }

  bySubject.forEach(s => { s.name = sNameMap[s.subjectId] || ''; });

  const points = list.map(m => ({
    knowledgePointId: m.knowledgePointId,
    subjectId: m.subjectId,
    name: kNameMap[m.knowledgePointId] || '',
    subjectName: sNameMap[m.subjectId] || '',
    totalCount: m.totalCount || 0,
    correctCount: m.correctCount || 0,
    masteryRate: m.masteryRate != null
      ? m.masteryRate
      : (m.totalCount ? m.correctCount / m.totalCount : null),
    lastPracticedAt: m.lastPracticedAt
  }));

  return {
    summary: {
      totalPractice,
      totalCorrect,
      accuracyRate: totalPractice ? totalCorrect / totalPractice : 0,
      masteredPoints,
      weakPoints
    },
    bySubject,
    points
  };
};
