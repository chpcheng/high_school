// 云函数：getSubjects —— 返回全部学科
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const res = await db.collection('subjects').orderBy('order', 'asc').get();
  return res.data;
};
