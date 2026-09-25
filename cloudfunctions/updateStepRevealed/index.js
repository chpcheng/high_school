// 云函数：updateStepRevealed —— 记录学生查看分步解析的进度
// 入参：{ questionId, stepRevealed }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!event.questionId) return { ok: false };

  const res = await db.collection('answer_records')
    .where({ userId: OPENID, questionId: event.questionId })
    .orderBy('answeredAt', 'desc')
    .limit(1)
    .get();

  if (res.data.length) {
    const rec = res.data[0];
    const newVal = Math.max(rec.stepRevealed || 0, event.stepRevealed || 0);
    await db.collection('answer_records').doc(rec._id).update({ data: { stepRevealed: newVal } });
  }
  return { ok: true };
};
