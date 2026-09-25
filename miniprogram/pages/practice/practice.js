const { TYPE_TEXT, DIFFICULTY_TEXT } = require('../../utils/util');
const app = getApp();

Page({
  data: {
    loading: true,
    subjectName: '',
    questions: [],      // 题目列表（不含答案）
    current: 0,
    total: 0,
    typeText: '',
    difficultyText: '',
    // 当前题作答状态
    selectedKeys: [],   // 单选/多选
    fillText: '',       // 填空
    solutionText: ''    // 解答
  },

  onLoad(options) {
    const subjectName = options.subjectName || '';
    this.setData({ subjectName });
    this._answers = [];  // 每题的作答 { questionId, userAnswer, timeSpent }
    this._startAt = 0;

    if (options.questionId) {
      // 单题重做/复习模式
      this.loadSingle(options.questionId);
    } else if (options.questionIds) {
      this.loadByIds(options.questionIds.split(','));
    } else {
      const pointIds = options.pointIds ? options.pointIds.split(',') : [];
      const difficulty = Number(options.difficulty || 0);
      const count = Number(options.count || 10);
      this.loadPractice(pointIds, difficulty, count);
    }
  },

  // 练习模式：按知识点+难度随机抽题
  loadPractice(pointIds, difficulty, count) {
    wx.cloud.callFunction({
      name: 'getQuestions',
      data: { pointIds, difficulty, count }
    }).then(res => {
      this.initQuestions(res.result || []);
    }).catch(err => {
      console.error(err);
      wx.showToast({ title: '加载题目失败', icon: 'none' });
    });
  },

  // 单题模式
  loadSingle(questionId) {
    wx.cloud.callFunction({ name: 'getQuestionDetail', data: { questionId, withAnswer: false } })
      .then(res => {
        const q = res.result;
        this.initQuestions(q ? [q] : []);
      }).catch(err => {
        console.error(err);
        wx.showToast({ title: '加载题目失败', icon: 'none' });
      });
  },

  // 多题复习模式（按 ids）
  loadByIds(ids) {
    wx.cloud.callFunction({ name: 'getQuestions', data: { questionIds: ids } })
      .then(res => {
        this.initQuestions(res.result || []);
      }).catch(err => {
        console.error(err);
        wx.showToast({ title: '加载题目失败', icon: 'none' });
      });
  },

  initQuestions(questions) {
    if (!questions.length) {
      wx.showToast({ title: '暂无题目', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }
    this._answers = questions.map(q => ({
      questionId: q._id,
      userAnswer: this.emptyAnswer(q.type),
      timeSpent: 0
    }));
    this.setData({
      questions,
      total: questions.length,
      current: 0,
      loading: false
    });
    this.refreshCurrent(0);
  },

  emptyAnswer(type) {
    if (type === 'single' || type === 'multiple') return { keys: [] };
    if (type === 'fill') return { text: '' };
    return { text: '' };
  },

  refreshCurrent(index) {
    const q = this.data.questions[index];
    if (!q) return;
    const ans = this._answers[index].userAnswer;
    this._startAt = Date.now();
    this.setData({
      current: index,
      typeText: TYPE_TEXT[q.type] || '',
      difficultyText: DIFFICULTY_TEXT[q.difficulty] || '',
      selectedKeys: ans.keys ? ans.keys.slice() : [],
      fillText: ans.text || '',
      solutionText: ans.text || ''
    });
  },

  // 保存当前题作答 + 用时，然后跳转
  saveCurrent() {
    const i = this.data.current;
    const q = this.data.questions[i];
    const ans = this._answers[i];
    const type = q.type;
    let userAnswer;
    if (type === 'single' || type === 'multiple') {
      userAnswer = { keys: this.data.selectedKeys.slice() };
    } else if (type === 'fill') {
      userAnswer = { text: this.data.fillText };
    } else {
      userAnswer = { text: this.data.solutionText };
    }
    ans.userAnswer = userAnswer;
    ans.timeSpent = Math.max(0, Math.round((Date.now() - this._startAt) / 1000));
  },

  // 单选：点选项
  selectOption(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ selectedKeys: [key] });
  },

  // 多选：切换选项
  toggleOption(e) {
    const key = e.currentTarget.dataset.key;
    let keys = this.data.selectedKeys.slice();
    const idx = keys.indexOf(key);
    if (idx >= 0) keys.splice(idx, 1);
    else keys.push(key);
    this.setData({ selectedKeys: keys });
  },

  onFillInput(e) {
    this.setData({ fillText: e.detail.value });
  },

  onSolutionInput(e) {
    this.setData({ solutionText: e.detail.value });
  },

  prev() {
    if (this.data.current === 0) return;
    this.saveCurrent();
    this.refreshCurrent(this.data.current - 1);
  },

  next() {
    if (this.data.current === this.data.total - 1) {
      this.submit();
      return;
    }
    this.saveCurrent();
    this.refreshCurrent(this.data.current + 1);
  },

  // 校验当前题是否已作答（非空）
  isCurrentAnswered() {
    const q = this.data.questions[this.data.current];
    if (q.type === 'single' || q.type === 'multiple') {
      return this.data.selectedKeys.length > 0;
    }
    if (q.type === 'fill') {
      return (this.data.fillText || '').trim().length > 0;
    }
    return (this.data.solutionText || '').trim().length > 0;
  },

  submit() {
    if (!this.isCurrentAnswered()) {
      wx.showToast({ title: '请先作答本题', icon: 'none' });
      return;
    }
    this.saveCurrent();

    wx.showLoading({ title: '提交批改中' });
    wx.cloud.callFunction({
      name: 'submitAnswer',
      data: { answers: this._answers }
    }).then(res => {
      wx.hideLoading();
      const results = (res.result && res.result.results) || [];
      app.globalData.practiceResult = { results };
      // 用 redirectTo，使解析页成为栈顶
      wx.redirectTo({ url: '/pages/result/result' });
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    });
  }
});
