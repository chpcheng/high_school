const app = getApp();

Page({
  data: {
    subjects: []
  },

  onLoad() {
    this.loadSubjects();
  },

  loadSubjects() {
    wx.cloud.callFunction({ name: 'getSubjects' })
      .then(res => {
        this.setData({ subjects: res.result || [] });
      })
      .catch(err => {
        console.error('加载学科失败', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  goKnowledge(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/knowledge/knowledge?subjectId=${id}&subjectName=${name}` });
  }
});
