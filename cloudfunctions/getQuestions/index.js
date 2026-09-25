// 云函数：getQuestions —— 按条件随机抽题（不返回答案/解析/步骤）
// 入参：{ pointIds?: [], difficulty?: 0-3, count?: number, questionIds?: [],
//        excludeRecent?: boolean, recentLimit?: number }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const count = event.count || 10;
  const cond = { status: 'published' };
  const isExact = !!(event.questionIds && event.questionIds.length);

  if (isExact) {
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

  // 随机抽题分支：剔除当前用户最近做过的题（精确取题或显式关闭时跳过）
  const excludeRecent = event.excludeRecent !== false;
  if (!isExact && excludeRecent) {
    const recentLimit = Math.min(event.recentLimit || 200, 100);
    const { OPENID } = cloud.getWXContext();
    const doneRes = await db.collection('answer_records')
      .where({ userId: OPENID })
      .field({ questionId: true })
      .orderBy('answeredAt', 'desc')
      .limit(recentLimit)
      .get();
    const doneSet = new Set(doneRes.data.map(r => r.questionId));
    const fresh = list.filter(q => !doneSet.has(q._id));
    const removed = list.filter(q => doneSet.has(q._id));
    let picked = fresh;
    if (picked.length < count) {
      picked = fresh.concat(removed.slice(0, count - fresh.length));
    }
    return picked.slice(0, count);
  }

  return list.slice(0, count);
};
