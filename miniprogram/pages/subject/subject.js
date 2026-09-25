const app = getApp();

// 学科名 → t-icon 图标名映射
const SUBJECT_ICON = {
  '数学': 'calculator',
  '语文': 'book-open',
  '英语': 'translate',
  '物理': 'chart-ring',
  '化学': 'chart-bubble',
  '生物': 'tree-round-dot',
  '历史': 'time',
  '地理': 'earth',
  '政治': 'flag'
};

Page({
  data: {
    subjects: [],
    hasSubjects: false
  },

  onLoad() {
    this.loadSubjects();
  },

  loadSubjects() {
    wx.cloud.callFunction({ name: 'getSubjects' })
      .then(res => {
        const subjects = (res.result || []).map(s => ({
          ...s,
          iconName: SUBJECT_ICON[s.name] || 'book'
        }));
        this.setData({ subjects, hasSubjects: subjects.length > 0 });
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
