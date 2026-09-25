const { TYPE_TEXT, DIFFICULTY_TEXT } = require('../../utils/util');
const app = getApp();

Page({
  data: {
    loading: true,
    error: false,       // 加载失败态
    empty: false,       // 无题目态
    subjectName: '',
    questions: [],      // 题目列表（不含答案）
    current: 0,
    total: 0,
    typeText: '',
    difficultyText: '',
    // 当前题作答状态
    selectedKeys: [],   // 单选/多选
    selectedMap: {},    // 选中项映射（供 WXML 高亮，避免 indexOf）
    fillText: '',       // 填空
    solutionText: '',   // 解答
    solutionImages: [], // 解答题已上传图片的 fileID 数组
    canUpload: false    // 是否还能继续上传（< 3 张）
  },

  onLoad(options) {
    const subjectName = options.subjectName || '';
    this.setData({ subjectName });
    this._answers = [];  // 每题的作答 { questionId, userAnswer, timeSpent }
    this._startAt = 0;

    if (options.questionId) {
      // 单题重做/复习模式
      this._loader = () => this.loadSingle(options.questionId);
      this.loadSingle(options.questionId);
    } else if (options.questionIds) {
      this._loader = () => this.loadByIds(options.questionIds.split(','));
      this.loadByIds(options.questionIds.split(','));
    } else {
      const pointIds = options.pointIds ? options.pointIds.split(',') : [];
      const difficulty = Number(options.difficulty || 0);
      const count = Number(options.count || 10);
      this._loader = () => this.loadPractice(pointIds, difficulty, count);
      this.loadPractice(pointIds, difficulty, count);
    }
  },

  // 失败重试
  retry() {
    this.setData({ loading: true, error: false, empty: false });
    if (this._loader) this._loader();
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
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
      this.setData({ loading: false, error: true });
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
        this.setData({ loading: false, error: true });
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
        this.setData({ loading: false, error: true });
      });
  },

  initQuestions(questions) {
    if (!questions.length) {
      // 展示空态，不自动返回
      this.setData({ loading: false, empty: true });
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
    return { text: '', images: [] };
  },

  refreshCurrent(index) {
    const q = this.data.questions[index];
    if (!q) return;
    const ans = this._answers[index].userAnswer;
    this._startAt = Date.now();
    const keys = ans.keys ? ans.keys.slice() : [];
    const solutionImages = (ans.images || []).slice();
    this.setData({
      current: index,
      typeText: TYPE_TEXT[q.type] || '',
      difficultyText: DIFFICULTY_TEXT[q.difficulty] || '',
      selectedKeys: keys,
      selectedMap: this.buildSelectedMap(keys),
      fillText: ans.text || '',
      solutionText: ans.text || '',
      solutionImages,
      canUpload: solutionImages.length < 3
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
      userAnswer = { text: this.data.solutionText, images: this.data.solutionImages.slice() };
    }
    ans.userAnswer = userAnswer;
    ans.timeSpent = Math.max(0, Math.round((Date.now() - this._startAt) / 1000));
  },

  // 由 keys 数组生成选中映射
  buildSelectedMap(keys) {
    const map = {};
    (keys || []).forEach(k => { map[k] = true; });
    return map;
  },

  // 单选：点选项
  selectOption(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ selectedKeys: [key], selectedMap: this.buildSelectedMap([key]) });
  },

  // 多选：切换选项
  toggleOption(e) {
    const key = e.currentTarget.dataset.key;
    let keys = this.data.selectedKeys.slice();
    const idx = keys.indexOf(key);
    if (idx >= 0) keys.splice(idx, 1);
    else keys.push(key);
    this.setData({ selectedKeys: keys, selectedMap: this.buildSelectedMap(keys) });
  },

  onFillInput(e) {
    this.setData({ fillText: e.detail.value });
  },

  onSolutionInput(e) {
    this.setData({ solutionText: e.detail.value });
  },

  // 拍照/相册上传解答图片
  async chooseImage() {
    const remain = 3 - this.data.solutionImages.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 3 张', icon: 'none' });
      return;
    }
    try {
      const openid = await app.ensureLogin();
      const res = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: remain,
          mediaType: ['image'],
          sourceType: ['camera', 'album'],
          sizeType: ['compressed'],
          success: resolve,
          fail: reject
        });
      });
      const tempFiles = res.tempFiles || [];
      if (!tempFiles.length) return;
      const fileIDs = await Promise.all(tempFiles.map((file, i) => {
        const cloudPath = 'answer-images/' + openid + '/' + Date.now() + '-' + i + '-' + Math.floor(Math.random() * 100000) + '.jpg';
        return wx.cloud.uploadFile({ cloudPath, filePath: file.tempFilePath });
      })).then(rs => rs.map(r => r.fileID));
      const merged = this.data.solutionImages.concat(fileIDs);
      this.setData({ solutionImages: merged, canUpload: merged.length < 3 });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '上传失败，请重试', icon: 'none' });
    }
  },

  // 移除已上传图片（仅移除引用，不删云存储文件）
  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.solutionImages.slice();
    images.splice(index, 1);
    this.setData({ solutionImages: images, canUpload: images.length < 3 });
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

  // 预览已上传的解答图片
  previewUpload(e) {
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
    return (this.data.solutionText || '').trim().length > 0 || this.data.solutionImages.length > 0;
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
