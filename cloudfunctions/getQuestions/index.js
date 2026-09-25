// 云函数：getQuestions —— 按条件随机抽题（不返回答案/解析/步骤）
// 入参：{ pointIds?: [], difficulty?: 0-3, count?: number, questionIds?: [] }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const count = event.count || 10;
  const cond = { status: 'published' };

  if (event.questionIds && event.questionIds.length) {
    cond._id = _.in(event.questionIds);
  } else {
    if (event.pointIds && event.pointIds.length) {
      cond.knowledgePointId = _.in(event.pointIds);
    }
    if (event.difficulty && event.difficulty > 0) {
      cond.difficulty = event.difficulty;
    }
  }

  const res = await db.collection('questions')
    .where(cond)
    .field({ answer: false, analysis: false, steps: false })
    .limit(100)
    .get();

  const list = res.data;
  // 洗牌，随机抽取
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, count);
};
