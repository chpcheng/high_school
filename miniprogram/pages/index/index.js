const app = getApp();
const { masteryColor, masteryLabel } = require('../../utils/util');

Page({
  data: {
    hasLogin: false,
    summary: {
      totalPractice: 0,
      totalCorrect: 0,
      accuracyRate: 0,
      weakPoints: 0
    },
    weakList: [],
    hasWeak: false
  },

  onShow() {
    this.loadOverview();
  },

  async loadOverview() {
    await app.ensureLogin();
    this.setData({ hasLogin: app.globalData.hasLogin });
    wx.cloud.callFunction({ name: 'getStats' })
      .then(res => {
        const data = res.result || {};
        const summary = data.summary || {};
        const weakList = (data.points || [])
          .filter(p => p.masteryRate < 0.6 || p.totalCount < 3)
          .slice(0, 5)
          .map(p => ({
            subjectId: p.subjectId,
            knowledgePointId: p.knowledgePointId,
            name: p.name,
            totalCount: p.totalCount || 0,
            correctCount: p.correctCount || 0,
            rateText: p.masteryRate != null ? Math.round(p.masteryRate * 100) + '%' : '未练习',
            rateColor: p.masteryRate == null ? '#C0C4CC' : (p.masteryRate >= 0.6 ? '#F5A623' : '#E8564A')
          }));
        this.setData({
          summary: {
            totalPractice: summary.totalPractice || 0,
            totalCorrect: summary.totalCorrect || 0,
            accuracyRate: Math.round((summary.accuracyRate || 0) * 100),
            weakPoints: summary.weakPoints || 0
          },
          weakList,
          hasWeak: weakList.length > 0
        });
      })
      .catch(err => console.error('加载概览失败', err));
  },

  goSubject() {
    wx.navigateTo({ url: '/pages/subject/subject' });
  },

  goMistakes() {
    wx.switchTab({ url: '/pages/mistakes/mistakes' });
  },

  goStats() {
    wx.switchTab({ url: '/pages/stats/stats' });
  },

  // 点薄弱知识点 → 选题页自动带入
  goWeak(e) {
    const { subjectid, knowledgepointid, name } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/knowledge/knowledge?subjectId=${subjectid}&pointId=${knowledgepointid}&pointName=${name}`
    });
  }
});
