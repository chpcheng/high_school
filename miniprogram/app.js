// app.js —— 应用入口，负责云初始化与登录
const config = require('./utils/config');

App({
  globalData: {
    openid: '',
    hasLogin: false
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: config.envId,
      traceUser: true
    });
    this.login();
  },

  // 静默登录，获取 openid
  login() {
    return wx.cloud.callFunction({ name: 'login' })
      .then(res => {
        const openid = res.result && res.result.openid;
        if (openid) {
          this.globalData.openid = openid;
          this.globalData.hasLogin = true;
        }
        return openid;
      })
      .catch(err => {
        console.error('登录失败', err);
        return null;
      });
  },

  // 确保已登录（页面可 await 后使用 openid）
  ensureLogin() {
    if (this.globalData.hasLogin) {
      return Promise.resolve(this.globalData.openid);
    }
    return this.login();
  }
});
