// pages/profile/profile.js —— 授权登录 / 完善资料（头像选择 + 昵称填写）
// 说明：微信自 2022-10 起下线 getUserProfile，头像昵称改为「填写能力」：
//   · 头像：button open-type="chooseAvatar"，用户主动选择
//   · 昵称：input type="nickname"，用户主动填写（可一键带出微信昵称）
const app = getApp();

Page({
  data: {
    avatarUrl: '',        // 当前展示的头像（cloud:// fileID 或本地临时路径）
    avatarFileId: '',     // 已保存到云存储的头像 fileID
    avatarChanged: false, // 是否选择了新头像（需重新上传）
    nickname: '',
    saving: false
  },

  onLoad() {
    const user = app.getUserInfo() || {};
    this.setData({
      nickname: user.nickname || '',
      avatarUrl: user.avatarUrl || '',
      avatarFileId: user.avatarUrl || ''
    });
  },

  // 选择头像（微信原生能力，用户主动触发）
  onChooseAvatar(e) {
    const url = (e.detail && e.detail.avatarUrl) || '';
    if (!url) return;
    this.setData({
      avatarUrl: url,
      avatarChanged: true
    });
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({ nickname: (e.detail.value || '').trim() });
  },

  // 保存：先上传头像到云存储（如有新头像），再调用 updateProfile 云函数
  async onSave() {
    if (this.data.saving) return;
    const nickname = this.data.nickname.trim();

    if (!nickname && !this.data.avatarChanged) {
      wx.showToast({ title: '请填写昵称或选择头像', icon: 'none' });
      return;
    }
    if (nickname.length > 32) {
      wx.showToast({ title: '昵称不能超过 32 个字符', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...', mask: true });

    try {
      // 1) 上传新头像到云存储
      let avatarFileId = this.data.avatarFileId;
      if (this.data.avatarChanged && this.data.avatarUrl) {
        const ext = this.getExt(this.data.avatarUrl);
        const openid = app.globalData.openid || 'anon';
        const cloudPath = `avatars/${openid}_${Date.now()}${ext}`;
        const up = await wx.cloud.uploadFile({
          cloudPath,
          filePath: this.data.avatarUrl
        });
        avatarFileId = up.fileID;
      }

      // 2) 调用云函数保存
      const payload = {};
      if (nickname) payload.nickname = nickname;
      if (avatarFileId) payload.avatarUrl = avatarFileId;

      const res = await wx.cloud.callFunction({ name: 'updateProfile', data: payload });
      const r = res.result || {};

      if (!r.ok) {
        throw new Error(r.msg || '保存失败');
      }

      // 3) 更新本地缓存，避免返回后重新拉取
      app.setUserInfo({
        nickname: nickname || undefined,
        avatarUrl: avatarFileId || undefined
      });

      wx.hideLoading();
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (err) {
      wx.hideLoading();
      console.error('保存资料失败', err);
      wx.showToast({ title: (err && err.message) || '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  // 从临时路径提取扩展名（默认 .png）
  getExt(path) {
    const m = /\.(\w+)$/.exec(path || '');
    return m ? `.${m[1].toLowerCase()}` : '.png';
  }
});
