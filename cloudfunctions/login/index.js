// 云函数：login —— 静默登录：获取 openid / unionid，并在 users 集合完成「首次创建 / 重复更新」
// 返回：{ ok, openid, unionid, appid, isNewUser, user }
// user 字段：{ openid, nickname, avatarUrl, unionid, role, status, loginCount, createdAt, lastLoginAt }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 归一化用户信息，只返回前端需要的安全字段（不透出 _id 之外的多余字段）
function sanitizeUser(u) {
  return {
    openid: u.openid || '',
    nickname: u.nickname || '',
    avatarUrl: u.avatarUrl || '',
    unionid: u.unionid || '',
    role: u.role || 'student',
    status: u.status || 'active',
    loginCount: u.loginCount || 0,
    createdAt: u.createdAt || null,
    lastLoginAt: u.lastLoginAt || null
  };
}

exports.main = async () => {
  // getWXContext 在小程序调用时返回 { OPENID, APPID, UNIONID }
  // 注意：UNIONID 仅在「小程序已绑定微信开放平台」或用户关注同主体公众号等条件下才有值，
  // 未绑定时为 undefined，不能当作必填。
  const { OPENID, APPID, UNIONID } = cloud.getWXContext();

  // 异常：未拿到 openid（理论上小程序调用不会发生，兜底防御）
  if (!OPENID) {
    return { ok: false, code: 'NO_OPENID', msg: '未获取到 openid，请重试' };
  }

  const users = db.collection('users');
  const now = db.serverDate();

  try {
    const exist = await users.doc(OPENID).get().catch(() => null);
    const userDoc = exist && exist.data;

    // 首次登录：创建新用户记录
    if (!userDoc) {
      const newUser = {
        openid: OPENID,
        appid: APPID || '',
        unionid: UNIONID || '',
        nickname: '',
        avatarUrl: '',
        role: 'student',
        status: 'active',
        loginCount: 1,
        firstLoginAt: now,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now
      };
      await users.doc(OPENID).set({ data: newUser });

      return {
        ok: true,
        openid: OPENID,
        unionid: UNIONID || '',
        appid: APPID || '',
        isNewUser: true,
        user: sanitizeUser({ ...newUser, openid: OPENID })
      };
    }

    // 已存在：更新登录状态与基础信息（重复登录幂等，不产生重复记录）
    const patch = {
      appid: APPID || userDoc.appid || '',
      lastLoginAt: now,
      loginCount: (userDoc.loginCount || 0) + 1,
      updatedAt: now
    };
    // unionid 可能在首次登录时拿不到，后续满足条件拿到后补写
    if (UNIONID && !userDoc.unionid) {
      patch.unionid = UNIONID;
    }
    await users.doc(OPENID).update({ data: patch });

    const updated = { ...userDoc, ...patch, openid: OPENID };
    return {
      ok: true,
      openid: OPENID,
      unionid: updated.unionid || UNIONID || '',
      appid: updated.appid || '',
      isNewUser: false,
      user: sanitizeUser(updated)
    };
  } catch (e) {
    console.error('[login] error', e);
    return { ok: false, code: 'LOGIN_ERROR', msg: '登录失败，请稍后重试', error: e.message };
  }
};
