// 云函数：login —— 获取用户 openid
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const { OPENID, APPID } = cloud.getWXContext();
  return { openid: OPENID, appid: APPID };
};
