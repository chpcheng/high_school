// app.js —— 应用入口：云初始化 + 微信静默登录 + 用户信息缓存
const config = require('./utils/config');

App({
  globalData: {
    openid: '',
    unionid: '',
    hasLogin: false,
    isNewUser: false,
    userInfo: null,      // { nickname, avatarUrl, role, status, loginCount, ... }
    loginPromise: null   // 防并发重复登录
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    const cloudOpts = { traceUser: true };
    if (config.envId) {
      cloudOpts.env = config.envId;
    }
    wx.cloud.init(cloudOpts);
    // 启动即静默登录（无需用户点击授权弹窗）
    this.login();
  },

  // 静默登录：调用 login 云函数，服务端 upsert 用户记录后返回用户信息
  // 幂等：重复调用复用同一个 in-flight 请求，避免并发重复登录
  login() {
    if (this.globalData.loginPromise) {
      return this.globalData.loginPromise;
    }
    this.globalData.loginPromise = wx.cloud.callFunction({ name: 'login' })
      .then(res => {
        const r = (res && res.result) || {};
        if (r.ok && r.openid) {
          this.globalData.openid = r.openid;
          this.globalData.unionid = r.unionid || '';
          this.globalData.hasLogin = true;
          this.globalData.isNewUser = !!r.isNewUser;
          this.globalData.userInfo = r.user || null;
        }
        return r;
      })
      .catch(err => {
        console.error('登录失败', err);
        // 失败后清除缓存，允许下次重试
        this.globalData.loginPromise = null;
        return { ok: false, code: 'CALL_FAILED', msg: '登录请求失败' };
      });
    return this.globalData.loginPromise;
  },

  // 确保已登录：返回 openid（兼容既有页面用法；失败返回空串）
  async ensureLogin() {
    if (this.globalData.hasLogin) {
      return this.globalData.openid;
    }
    const r = await this.login();
    return r.ok ? (r.openid || '') : '';
  },

  // 强制刷新用户信息（资料更新后调用），返回最新 user
  async refreshUser() {
    this.globalData.loginPromise = null;
    const r = await this.login();
    return (r && r.ok) ? (r.user || null) : null;
  },

  // 同步读取缓存的用户信息
  getUserInfo() {
    return this.globalData.userInfo;
  },

  // 更新本地缓存的用户信息（updateProfile 成功后调用，避免多一次网络请求）
  setUserInfo(partial) {
    if (!this.globalData.userInfo) {
      this.globalData.userInfo = {};
    }
    this.globalData.userInfo = { ...this.globalData.userInfo, ...partial };
  }
});
