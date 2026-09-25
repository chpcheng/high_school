// 云函数：getKnowledgePoints —— 返回某学科的知识点，并附带当前用户的掌握度
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const subjectId = event.subjectId;

  const pr = await db.collection('knowledge_points')
    .where({ subjectId })
    .orderBy('order', 'asc')
    .get();

  const mr = await db.collection('mastery')
    .where({ userId: OPENID, subjectId })
    .get();

  const mMap = {};
  mr.data.forEach(m => { mMap[m.knowledgePointId] = m; });

  return pr.data.map(p => {
    const m = mMap[p._id];
    const rate = m ? (m.masteryRate != null ? m.masteryRate : (m.totalCount ? m.correctCount / m.totalCount : null)) : null;
    return {
      _id: p._id,
      subjectId: p.subjectId,
      name: p.name,
      parentId: p.parentId || '',
      totalCount: m ? m.totalCount : 0,
      correctCount: m ? m.correctCount : 0,
      masteryRate: rate
    };
  });
};
