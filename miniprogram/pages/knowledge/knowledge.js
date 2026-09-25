const { masteryColor, masteryLabel } = require('../../utils/util');

const DIFFICULTIES = [
  { value: 0, label: '不限' },
  { value: 1, label: '简单' },
  { value: 2, label: '中等' },
  { value: 3, label: '困难' }
];
const COUNTS = [5, 10, 15, 20];

Page({
  data: {
    subjectId: '',
    subjectName: '',
    points: [],
    selectedPointIds: [],
    selectedMap: {},
    allSelected: false,
    hasPoints: false,
    difficulty: 0,
    difficulties: DIFFICULTIES,
    count: 10,
    counts: COUNTS
  },

  onLoad(options) {
    const subjectId = options.subjectId || '';
    const subjectName = options.subjectName || '';
    const pointId = options.pointId || '';
    this.setData({ subjectId, subjectName });
    if (pointId) {
      this.setData({ selectedPointIds: [pointId], selectedMap: this.buildSelectedMap([pointId]) });
    }
    if (subjectId) {
      this.loadPoints(subjectId);
    }
  },

  loadPoints(subjectId) {
    wx.cloud.callFunction({ name: 'getKnowledgePoints', data: { subjectId } })
      .then(res => {
        const points = (res.result || []).map(p => ({
          ...p,
          masteryText: p.masteryRate != null ? (p.masteryRate * 100).toFixed(0) + '%' : '未练习',
          masteryColor: masteryColor(p.masteryRate),
          masteryLabel: masteryLabel(p.masteryRate)
        }));
        const selected = this.data.selectedPointIds;
        this.setData({
          points,
          hasPoints: points.length > 0,
          allSelected: selected.length > 0 && selected.length === points.length
        });
      })
      .catch(err => console.error('加载知识点失败', err));
  },

  togglePoint(e) {
    const { id } = e.currentTarget.dataset;
    let selected = this.data.selectedPointIds.slice();
    const idx = selected.indexOf(id);
    if (idx >= 0) selected.splice(idx, 1);
    else selected.push(id);
    const points = this.data.points;
    this.setData({
      selectedPointIds: selected,
      selectedMap: this.buildSelectedMap(selected),
      allSelected: selected.length > 0 && selected.length === points.length
    });
  },

  buildSelectedMap(ids) {
    const map = {};
    (ids || []).forEach(id => { map[id] = true; });
    return map;
  },

  selectAll() {
    const all = this.data.points.map(p => p._id);
    const isAll = all.length && this.data.selectedPointIds.length === all.length;
    const selected = isAll ? [] : all;
    this.setData({
      selectedPointIds: selected,
      selectedMap: this.buildSelectedMap(selected),
      allSelected: selected.length > 0 && selected.length === all.length
    });
  },

  setDifficulty(e) {
    this.setData({ difficulty: Number(e.currentTarget.dataset.value) });
  },

  setCount(e) {
    this.setData({ count: Number(e.currentTarget.dataset.value) });
  },

  start() {
    const { subjectId, subjectName, selectedPointIds, difficulty, count } = this.data;
    let pointIds = selectedPointIds;
    if (!pointIds.length) {
      pointIds = this.data.points.map(p => p._id);
    }
    if (!pointIds.length) {
      wx.showToast({ title: '该学科暂无知识点', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/practice/practice?subjectId=${subjectId}&subjectName=${subjectName}` +
           `&pointIds=${pointIds.join(',')}&difficulty=${difficulty}&count=${count}`
    });
  }
});
