// utils/util.js —— 通用工具函数

// 题型中文名
const TYPE_TEXT = {
  single: '单选题',
  multiple: '多选题',
  fill: '填空题',
  solution: '解答题'
};

// 难度中文名
const DIFFICULTY_TEXT = {
  1: '简单',
  2: '中等',
  3: '困难'
};

const DIFFICULTY_COLOR = {
  1: '#2FB26A',
  2: '#F5A623',
  3: '#E8564A'
};

// 格式化用时（秒 → 字符串）
function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '-';
  if (seconds < 60) return seconds + '秒';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? m + '分' + s + '秒' : m + '分钟';
}

// 格式化日期
function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '-';
  const pad = n => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// 掌握率 → 颜色
function masteryColor(rate) {
  if (rate == null) return '#C0C4CC';
  if (rate >= 0.8) return '#2FB26A';
  if (rate >= 0.6) return '#F5A623';
  return '#E8564A';
}

// 掌握率 → 文案
function masteryLabel(rate) {
  if (rate == null) return '未练习';
  if (rate >= 0.8) return '已掌握';
  if (rate >= 0.6) return '掌握中';
  return '薄弱';
}

module.exports = {
  TYPE_TEXT,
  DIFFICULTY_TEXT,
  DIFFICULTY_COLOR,
  formatTime,
  formatDate,
  masteryColor,
  masteryLabel
};
