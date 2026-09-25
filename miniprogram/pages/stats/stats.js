const { masteryColor, masteryLabel } = require('../../utils/util');

Page({
  data: {
    summary: { totalPractice: 0, totalCorrect: 0, accuracyRate: 0, weakPoints: 0, masteredPoints: 0 },
    bySubject: [],
    hasBySubject: false,
    points: [],
    hasPoints: false
  },

  onShow() {
    this.load();
  },

  load() {
    wx.cloud.callFunction({ name: 'getStats' })
      .then(res => {
        const data = res.result || {};
        const summary = data.summary || {};
        const bySubject = (data.bySubject || []).map(s => ({
          ...s,
          rate: Math.round((s.masteryRate || 0) * 100),
          color: masteryColor(s.masteryRate)
        }));
        const points = (data.points || []).map(p => ({
          ...p,
          rate: p.masteryRate != null ? Math.round(p.masteryRate * 100) : null,
          color: masteryColor(p.masteryRate),
          label: masteryLabel(p.masteryRate)
        })).sort((a, b) => {
          const ra = a.masteryRate == null ? 0 : a.masteryRate;
          const rb = b.masteryRate == null ? 0 : b.masteryRate;
          return ra - rb;
        });
        this.setData({
          summary: {
            totalPractice: summary.totalPractice || 0,
            totalCorrect: summary.totalCorrect || 0,
            accuracyRate: Math.round((summary.accuracyRate || 0) * 100),
            weakPoints: summary.weakPoints || 0,
            masteredPoints: summary.masteredPoints || 0
          },
          bySubject,
          hasBySubject: bySubject.length > 0,
          points,
          hasPoints: points.length > 0
        });
      })
      .catch(err => console.error('加载统计失败', err));
  },

  // 点知识点 → 巩固练习
  goPoint(e) {
    const { subjectid, pointid, name } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/knowledge/knowledge?subjectId=${subjectid}&pointId=${pointid}&pointName=${name}`
    });
  }
});
