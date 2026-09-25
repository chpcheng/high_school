const app = getApp();
const { TYPE_TEXT, DIFFICULTY_TEXT } = require('../../utils/util');

Page({
  data: {
    loading: true,
    results: [],
    current: 0,
    total: 0,
    cur: null,          // 当前题的展示数据
    revealedCount: 1,   // 已揭示的步骤数
    canReveal: false,
    mode: 'submit'      // submit | review
  },

  onLoad(options) {
    if (options.questionId) {
      this.loadReview(options.questionId);
    } else {
      this.loadFromGlobal();
    }
  },

  loadFromGlobal() {
    const data = app.globalData.practiceResult;
    if (!data || !data.results || !data.results.length) {
      wx.showToast({ title: '无练习结果', icon: 'none' });
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 800);
      return;
    }
    this.setData({
      results: data.results,
      total: data.results.length,
      mode: 'submit',
      loading: false
    });
    this.applyCurrent(0);
  },

  loadReview(questionId) {
    wx.cloud.callFunction({ name: 'getQuestionDetail', data: { questionId, withAnswer: true } })
      .then(res => {
        const q = res.result;
        if (!q) {
          wx.showToast({ title: '题目不存在', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 800);
          return;
        }
        const results = [{ questionId, question: q, isCorrect: null, score: null, userAnswer: null }];
        this.setData({ results, total: 1, mode: 'review', loading: false });
        this.applyCurrent(0);
      }).catch(err => {
        console.error(err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  applyCurrent(index) {
    const r = this.data.results[index];
    if (!r) return;
    const q = r.question;
    const revealedCount = 1; // 每次切题重置为仅展示第一步

    // 选项高亮
    let optionsView = [];
    if (q.type === 'single' || q.type === 'multiple') {
      const correctSet = new Set((q.answer && q.answer.keys) || []);
      const userSet = new Set((r.userAnswer && r.userAnswer.keys) || []);
      optionsView = (q.options || []).map(o => {
        let cls = '';
        if (correctSet.has(o.key)) cls = 'correct';
        else if (userSet.has(o.key)) cls = 'wrong';
        return { key: o.key, text: o.text, cls };
      });
    }

    // 答案文案
    let answerText = '';
    if (q.type === 'single' || q.type === 'multiple') {
      answerText = ((q.answer && q.answer.keys) || []).join('、');
    } else if (q.type === 'fill') {
      answerText = ((q.answer && q.answer.blanks) || []).map(b => (Array.isArray(b) ? b[0] : b)).join('；');
    } else {
      answerText = (q.answer && q.answer.reference) || '';
    }

    let userAnswerText = '';
    if (r.userAnswer) {
      if (q.type === 'single' || q.type === 'multiple') {
        userAnswerText = (r.userAnswer.keys || []).join('、') || '未作答';
      } else {
        userAnswerText = r.userAnswer.text || '未作答';
      }
    } else {
      userAnswerText = '（仅查看解析）';
    }

    // 步骤
    const stepsView = (q.steps || []).map((s, i) => ({
      ...s,
      visible: i < revealedCount
    }));

    this.setData({
      current: index,
      revealedCount,
      canReveal: revealedCount < (q.steps || []).length,
      cur: {
        typeText: TYPE_TEXT[q.type] || '',
        difficultyText: DIFFICULTY_TEXT[q.difficulty] || '',
        stem: q.stem,
        stemImage: q.stemImage,
        options: optionsView,
        type: q.type,
        answerText,
        userAnswerText,
        analysis: q.analysis || '',
        steps: stepsView,
        stepsTotal: (q.steps || []).length,
        isCorrect: r.isCorrect,
        score: r.score,
        showResult: r.isCorrect !== null
      }
    });
  },

  // 查看下一步（逐步揭示）
  revealNext() {
    const steps = this.data.cur.steps;
    let revealed = this.data.revealedCount + 1;
    if (revealed > steps.length) revealed = steps.length;
    const stepsView = steps.map((s, i) => ({ ...s, visible: i < revealed }));
    this.setData({
      revealedCount: revealed,
      canReveal: revealed < steps.length,
      'cur.steps': stepsView
    });
  },

  revealAll() {
    const steps = this.data.cur.steps;
    const stepsView = steps.map(s => ({ ...s, visible: true }));
    this.setData({
      revealedCount: steps.length,
      canReveal: false,
      'cur.steps': stepsView
    });
  },

  prevResult() {
    if (this.data.current === 0) return;
    this.reportRevealed();
    this.applyCurrent(this.data.current - 1);
  },

  nextResult() {
    this.reportRevealed();
    if (this.data.current === this.data.total - 1) {
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }
    this.applyCurrent(this.data.current + 1);
  },

  // 重做本题
  redo() {
    const r = this.data.results[this.data.current];
    wx.navigateTo({ url: `/pages/practice/practice?questionId=${r.questionId}` });
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 记录本步查看进度
  reportRevealed() {
    const r = this.data.results[this.data.current];
    if (!r || !this.data.revealedCount) return;
    wx.cloud.callFunction({
      name: 'updateStepRevealed',
      data: { questionId: r.questionId, stepRevealed: this.data.revealedCount }
    }).catch(() => {});
  },

  onUnload() {
    this.reportRevealed();
  }
});
