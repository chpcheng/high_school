const app = getApp();

Page({
  data: {
    openid: '',
    nickname: '',
    avatarUrl: '',
    hasProfile: false,   // 是否已完善昵称/头像
    summary: { totalPractice: 0, totalCorrect: 0, accuracyRate: 0 }
  },

  onShow() {
    this.load();
  },

  async load() {
    await app.ensureLogin();
    const openid = app.globalData.openid || '';
    const user = app.getUserInfo() || {};
    const nickname = user.nickname || '';
    const avatarUrl = user.avatarUrl || '';
    this.setData({
      openid: openid ? openid.slice(0, 8) + '****' : '',
      nickname,
      avatarUrl,
      hasProfile: !!(nickname || avatarUrl)
    });

    wx.cloud.callFunction({ name: 'getStats' })
      .then(res => {
        const s = (res.result && res.result.summary) || {};
        this.setData({
          summary: {
            totalPractice: s.totalPractice || 0,
            totalCorrect: s.totalCorrect || 0,
            accuracyRate: Math.round((s.accuracyRate || 0) * 100)
          }
        });
      }).catch(() => {});
  },

  // 进入资料完善/编辑页
  goProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  clearCache() {
    wx.showModal({
      title: '清理缓存',
      content: '确定清理本地缓存吗？不影响云端学习数据。',
      success: (r) => {
        if (!r.confirm) return;
        wx.clearStorageSync();
        wx.showToast({ title: '已清理', icon: 'success' });
      }
    });
  },

  about() {
    wx.showModal({
      title: '关于',
      content: '高中刷题小程序：按学科/知识点/难度分类练习，分步解析，错题本与掌握度统计。',
      showCancel: false
    });
  }
});
