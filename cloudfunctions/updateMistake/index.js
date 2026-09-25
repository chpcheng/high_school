// 云函数：updateMistake —— 更新/移除错题
// 入参：{ mistakeId, status?, remove?, note? }
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
  // 写笔记（允许空字符串=清除笔记）
  if (typeof event.note === 'string' && event.note.length <= 200) {
    await doc.update({ data: { note: event.note } });
    return { ok: true };
  }
  return { ok: false };
};
