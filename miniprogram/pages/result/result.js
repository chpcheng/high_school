const app = getApp();
const { TYPE_TEXT, DIFFICULTY_TEXT } = require('../../utils/util');

Page({
  data: {
    loading: true,
    error: false,       // 加载失败态
    empty: false,       // 无数据态
    results: [],
    current: 0,
    total: 0,
    cur: null,          // 当前题的展示数据
    revealedCount: 0,   // 已揭示的步骤数
    canReveal: false,
    mode: 'submit',     // submit | review
    stepMode: 'step',   // step 逐步 | think 思考
    thinkTip: '建议先自己想一想，再点开下一步',
    revealBtnText: '查看下一步'
  },

  onLoad(options) {
    if (options.questionId) {
      this._retry = () => this.loadReview(options.questionId);
      this.loadReview(options.questionId);
    } else {
      this.loadFromGlobal();
    }
  },

  // 失败重试
  retry() {
    this.setData({ loading: true, error: false, empty: false });
    if (this._retry) this._retry();
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  loadFromGlobal() {
    const data = app.globalData.practiceResult;
    if (!data || !data.results || !data.results.length) {
      this.setData({ empty: true, loading: false });
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
          this.setData({ empty: true, loading: false });
          return;
        }
        const results = [{ questionId, question: q, isCorrect: null, score: null, userAnswer: null }];
        this.setData({ results, total: 1, mode: 'review', loading: false });
        this.applyCurrent(0);
      }).catch(err => {
        console.error(err);
        this.setData({ error: true, loading: false });
      });
  },

  applyCurrent(index) {
    const r = this.data.results[index];
    if (!r) return;
    const q = r.question;
    const revealedCount = 0; // 每次切题重置为未展示步骤

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

    // banner 类型
    let bannerType = 'wrong';
    if (r.pending) {
      bannerType = 'pending';
    } else if (this.data.mode === 'review' || r.isCorrect === null) {
      bannerType = 'review';
    } else if (r.isCorrect === true) {
      bannerType = 'correct';
    }

    // 思考模式相关文案
    const thinkTip = this.data.stepMode === 'think'
      ? '思考模式：先独立思考，再点开下一步'
      : '建议先自己想一想，再点开下一步';
    const revealBtnText = this.data.stepMode === 'think' ? '我思考好了' : '查看下一步';

    this.setData({
      current: index,
      revealedCount,
      canReveal: revealedCount < (q.steps || []).length,
      thinkTip,
      revealBtnText,
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
        showResult: r.isCorrect !== null,
        bannerType,
        pending: r.pending
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
    this.reportRevealed();
  },

  revealAll() {
    const steps = this.data.cur.steps;
    const stepsView = steps.map(s => ({ ...s, visible: true }));
    this.setData({
      revealedCount: steps.length,
      canReveal: false,
      'cur.steps': stepsView
    });
    this.reportRevealed();
  },

  // 切换分步/思考模式
  toggleStepMode(e) {
    this.setData({ stepMode: e.currentTarget.dataset.mode, revealedCount: 0 });
    this.applyCurrent(this.data.current);
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
    if (!r || this.data.revealedCount <= 0) return;
    wx.cloud.callFunction({
      name: 'updateStepRevealed',
      data: { questionId: r.questionId, stepRevealed: this.data.revealedCount }
    }).catch(() => {});
  },

  // 预览题干配图（处理 cloud:// 需转临时 URL）
  previewStemImage(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;
    const open = urls => wx.previewImage({ urls, current: urls[0] });
    if (src.indexOf('cloud://') === 0) {
      wx.cloud.getTempFileURL({ fileList: [src] }).then(r => {
        const f = r.fileList && r.fileList[0];
        open([(f && f.tempFileURL) || src]);
      }).catch(() => {});
    } else {
      open([src]);
    }
  },

  onUnload() {
    this.reportRevealed();
  }
});
