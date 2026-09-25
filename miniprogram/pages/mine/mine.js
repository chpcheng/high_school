const app = getApp();

Page({
  data: {
    openid: '',
    summary: { totalPractice: 0, totalCorrect: 0, accuracyRate: 0 }
  },

  onShow() {
    this.load();
  },

  async load() {
    await app.ensureLogin();
    const openid = app.globalData.openid || '';
    this.setData({ openid: openid ? openid.slice(0, 8) + '****' : '' });
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
