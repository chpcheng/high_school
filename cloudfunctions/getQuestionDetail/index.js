// 云函数：getQuestionDetail —— 单题详情
// 入参：{ questionId, withAnswer?: boolean }（withAnswer=true 返回答案与分步解析，供解析页/回顾用）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const col = db.collection('questions').doc(event.questionId);
  let res;
  if (event.withAnswer) {
    res = await col.get();
  } else {
    res = await col.field({ answer: false, analysis: false, steps: false }).get();
  }
  return res.data;
};
