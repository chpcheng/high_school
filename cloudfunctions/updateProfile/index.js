// 云函数：updateProfile —— 更新用户昵称、头像（头像为云存储 fileID）
// 入参：{ nickname?, avatarUrl? }
// 说明：头像由前端 chooseAvatar 获取临时文件后上传到云存储，此处只接受 cloud:// 开头的 fileID
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const NICKNAME_MAX = 32;
const AVATAR_PREFIX = 'cloud://';

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    return { ok: false, code: 'NO_OPENID', msg: '未获取到 openid，请重新进入小程序' };
  }

  const patch = {};

  // 昵称校验：去首尾空格，非空才写；长度上限 32
  if (typeof event.nickname === 'string') {
    const nick = event.nickname.trim();
    if (nick.length > NICKNAME_MAX) {
      return { ok: false, code: 'INVALID_NICKNAME', msg: `昵称不能超过 ${NICKNAME_MAX} 个字符` };
    }
    if (nick) patch.nickname = nick;
  }

  // 头像校验：只接受云存储 fileID，防止写入任意外链
  if (typeof event.avatarUrl === 'string' && event.avatarUrl) {
    if (!event.avatarUrl.startsWith(AVATAR_PREFIX)) {
      return { ok: false, code: 'INVALID_AVATAR', msg: '头像格式不正确' };
    }
    patch.avatarUrl = event.avatarUrl;
  }

  if (!Object.keys(patch).length) {
    return { ok: false, code: 'EMPTY', msg: '没有需要更新的内容' };
  }

  patch.updatedAt = db.serverDate();

  try {
    const exist = await db.collection('users').doc(OPENID).get().catch(() => null);

    // 兜底：极端情况下用户尚未通过 login 建立记录（例如手动调用了本函数）
    if (!exist || !exist.data) {
      await db.collection('users').doc(OPENID).set({
        data: {
          openid: OPENID,
          appid: '',
          unionid: '',
          nickname: patch.nickname || '',
          avatarUrl: patch.avatarUrl || '',
          role: 'student',
          status: 'active',
          loginCount: 1,
          lastLoginAt: db.serverDate(),
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });
    } else {
      await db.collection('users').doc(OPENID).update({ data: patch });
    }

    return { ok: true };
  } catch (e) {
    console.error('[updateProfile] error', e);
    return { ok: false, code: 'ERROR', msg: '保存失败，请稍后重试', error: e.message };
  }
};
