const { TYPE_TEXT, DIFFICULTY_TEXT, formatDate } = require('../../utils/util');

Page({
  data: {
    subjects: [],
    statusTabs: [
      { value: 'all', label: '全部' },
      { value: 'open', label: '未掌握' },
      { value: 'resolved', label: '已掌握' }
    ],
    subjectFilter: '',
    statusFilter: 'all',
    list: [],
    loading: false,
    finished: false
  },

  onShow() {
    this.loadSubjects();
    this.refresh();
  },

  loadSubjects() {
    wx.cloud.callFunction({ name: 'getSubjects' })
      .then(res => {
        this.setData({ subjects: res.result || [] });
      }).catch(() => {});
  },

  refresh() {
    this.setData({ list: [], finished: false });
    this.loadList(true);
  },

  loadList(reset) {
    if (this.data.loading) return;
    this.setData({ loading: true });
    const skip = reset ? 0 : this.data.list.length;
    wx.cloud.callFunction({
      name: 'getMistakes',
      data: {
        subjectId: this.data.subjectFilter,
        status: this.data.statusFilter,
        skip,
        limit: 20
      }
    }).then(res => {
      const items = (res.result || []).map(m => ({
        ...m,
        typeText: TYPE_TEXT[m.type] || '',
        difficultyText: DIFFICULTY_TEXT[m.difficulty] || '',
        dateText: formatDate(m.lastWrongAt)
      }));
      const list = reset ? items : this.data.list.concat(items);
      this.setData({
        list,
        loading: false,
        finished: items.length < 20
      });
    }).catch(err => {
      console.error(err);
      this.setData({ loading: false });
    });
  },

  onReachBottom() {
    if (!this.data.finished) this.loadList(false);
  },

  setStatus(e) {
    this.setData({ statusFilter: e.currentTarget.dataset.value });
    this.refresh();
  },

  setSubject(e) {
    this.setData({ subjectFilter: e.currentTarget.dataset.value });
    this.refresh();
  },

  // 查看解析
  viewDetail(e) {
    const { questionid } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/result/result?questionId=${questionid}` });
  },

  // 重做
  redo(e) {
    const { questionid } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/practice/practice?questionId=${questionid}` });
  },

  // 切换掌握状态
  toggleStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    const newStatus = status === 'open' ? 'resolved' : 'open';
    wx.cloud.callFunction({
      name: 'updateMistake',
      data: { mistakeId: id, status: newStatus }
    }).then(() => {
      this.refresh();
    }).catch(err => {
      console.error(err);
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  // 移除错题
  remove(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '移除错题',
      content: '确定从错题本移除该题吗？',
      success: (r) => {
        if (!r.confirm) return;
        wx.cloud.callFunction({ name: 'updateMistake', data: { mistakeId: id, remove: true } })
          .then(() => this.refresh())
          .catch(() => wx.showToast({ title: '操作失败', icon: 'none' }));
      }
    });
  }
});
