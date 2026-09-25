// 云函数：initData —— 建集合 + 写入种子数据（部署后手动调用一次）
// 幂等：集合/数据已存在则跳过，可重复执行
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const seed = require('./seed');

const COLLECTIONS = ['subjects', 'knowledge_points', 'questions', 'answer_records', 'mistake_book', 'mastery', 'users'];

exports.main = async () => {
  // 1) 创建集合（已存在则忽略）
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name);
    } catch (e) {
      // 集合已存在，忽略
    }
  }

  // 2) 学科
  const subjRes = await db.collection('subjects').get();
  const subjMap = {};
  if (!subjRes.data.length) {
    for (const s of seed.subjects) {
      const r = await db.collection('subjects').add({ data: s });
      subjMap[s.name] = r._id;
    }
  } else {
    subjRes.data.forEach(s => { subjMap[s.name] = s._id; });
  }

  // 3) 知识点
  const pointRes = await db.collection('knowledge_points').get();
  const pointMap = {};
  if (!pointRes.data.length) {
    for (const p of seed.knowledgePoints) {
      const r = await db.collection('knowledge_points').add({
        data: { subjectId: subjMap[p.subject], name: p.name, parentId: '', order: p.order }
      });
      pointMap[`${p.subject}|${p.name}`] = r._id;
    }
  } else {
    pointRes.data.forEach(p => { pointMap[`${p.subjectId}|${p.name}`] = p._id; });
  }

  // 4) 题目
  const qRes = await db.collection('questions').get();
  if (!qRes.data.length) {
    for (const q of seed.questions) {
      await db.collection('questions').add({
        data: {
          subjectId: subjMap[q.subject],
          knowledgePointId: pointMap[`${q.subject}|${q.point}`],
          difficulty: q.difficulty,
          type: q.type,
          stem: q.stem,
          stemImage: q.stemImage || '',
          options: q.options || [],
          answer: q.answer,
          analysis: q.analysis,
          steps: q.steps,
          tags: [],
          source: '',
          status: 'published',
          createdBy: '',
          createdAt: db.serverDate()
        }
      });
    }
  }

  return {
    ok: true,
    collections: COLLECTIONS,
    subjects: seed.subjects.length,
    knowledgePoints: seed.knowledgePoints.length,
    questions: seed.questions.length
  };
};
