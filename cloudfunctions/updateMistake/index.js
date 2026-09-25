// 云函数：updateMistake —— 更新/移除错题
// 入参：{ mistakeId, status?, remove? }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!event.mistakeId) return { ok: false };

  const doc = db.collection('mistake_book').doc(event.mistakeId);

  if (event.remove) {
    await doc.remove();
    return { ok: true };
  }
  if (event.status) {
    await doc.update({ data: { status: event.status } });
    return { ok: true };
  }
  return { ok: false };
};
