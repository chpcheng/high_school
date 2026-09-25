// scripts/gen-tabbar-icons.js —— 生成 tabBar 的 8 个线性几何风格 PNG 图标
// 依赖 pngjs（零其它依赖），独立运行：
//   NODE_PATH=/Users/Zhuanz/.workbuddy/binaries/node/workspace/node_modules node scripts/gen-tabbar-icons.js
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SIZE = 81; // 图标边长（px）

// 颜色：普通态 / 选中态
const COLORS = {
  normal: { r: 138, g: 143, b: 153 }, // #8A8F99
  active: { r: 74, g: 108, b: 247 }   // #4A6CF7
};

// 透明度边缘覆盖（简单抗锯齿）
function cover(dist, r) {
  if (dist <= r - 0.5) return 1;
  if (dist >= r + 0.5) return 0;
  return r + 0.5 - dist;
}

// 写像素（覆盖到透明背景，带覆盖率）
function setPixel(png, x, y, color, coverage) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const cov = Math.max(0, Math.min(1, coverage));
  if (cov <= 0) return;
  const idx = (SIZE * y + x) << 2;
  const dstA = png.data[idx + 3];
  if (dstA === 0) {
    png.data[idx] = color.r;
    png.data[idx + 1] = color.g;
    png.data[idx + 2] = color.b;
    png.data[idx + 3] = Math.round(cov * 255);
  } else {
    const sa = cov;
    const da = dstA / 255;
    const outA = sa + da * (1 - sa);
    png.data[idx] = Math.round((color.r * sa + png.data[idx] * da * (1 - sa)) / outA);
    png.data[idx + 1] = Math.round((color.g * sa + png.data[idx + 1] * da * (1 - sa)) / outA);
    png.data[idx + 2] = Math.round((color.b * sa + png.data[idx + 2] * da * (1 - sa)) / outA);
    png.data[idx + 3] = Math.round(outA * 255);
  }
}

// 画实心矩形
function fillRect(png, x0, y0, x1, y1, color) {
  const sx = Math.max(0, Math.round(x0));
  const ex = Math.min(SIZE - 1, Math.round(x1));
  const sy = Math.max(0, Math.round(y0));
  const ey = Math.min(SIZE - 1, Math.round(y1));
  for (let y = sy; y <= ey; y++) {
    for (let x = sx; x <= ex; x++) setPixel(png, x, y, color, 1);
  }
}

// 画实心圆
function fillCircle(png, cx, cy, r, color) {
  const minX = Math.max(0, Math.floor(cx - r - 1));
  const maxX = Math.min(SIZE - 1, Math.ceil(cx + r + 1));
  const minY = Math.max(0, Math.floor(cy - r - 1));
  const maxY = Math.min(SIZE - 1, Math.ceil(cy + r + 1));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      const cov = cover(dist, r);
      if (cov > 0) setPixel(png, x, y, color, cov);
    }
  }
}

// 画上半圆（用于人形肩部）
function fillDome(png, cx, cy, r, color) {
  const minX = Math.max(0, Math.floor(cx - r - 1));
  const maxX = Math.min(SIZE - 1, Math.ceil(cx + r + 1));
  const minY = Math.max(0, Math.floor(cy - r - 1));
  const maxY = Math.min(SIZE - 1, Math.floor(cy));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      const cov = cover(dist, r);
      if (cov > 0) setPixel(png, x, y, color, cov);
    }
  }
}

// 画粗线（圆头，通过端点距离自然形成圆帽）
function drawLine(png, x0, y0, x1, y1, w, color) {
  const r = w / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  const minX = Math.max(0, Math.floor(Math.min(x0, x1) - r - 1));
  const maxX = Math.min(SIZE - 1, Math.ceil(Math.max(x0, x1) + r + 1));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1) - r - 1));
  const maxY = Math.min(SIZE - 1, Math.ceil(Math.max(y0, y1) + r + 1));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / lenSq));
      const px = x0 + t * dx;
      const py = y0 + t * dy;
      const dist = Math.hypot(x - px, y - py);
      const cov = cover(dist, r);
      if (cov > 0) setPixel(png, x, y, color, cov);
    }
  }
}

// 图标绘制（d 为封装后的绘制上下文，c 为颜色）
const ICONS = {
  // 首页：房子
  home(d, c) {
    d.line(40, 14, 11, 40, 4, c); // 屋顶左
    d.line(40, 14, 69, 40, 4, c); // 屋顶右
    d.line(17, 40, 17, 67, 4, c); // 左墙
    d.line(63, 40, 63, 67, 4, c); // 右墙
    d.line(17, 67, 63, 67, 4, c); // 底边
    d.rect(34, 50, 46, 67, c);    // 门
  },
  // 错题本：书本
  book(d, c) {
    d.line(14, 18, 66, 18, 4, c); // 上边
    d.line(14, 18, 14, 64, 4, c); // 左边
    d.line(66, 18, 66, 64, 4, c); // 右边
    d.line(14, 64, 66, 64, 4, c); // 下边
    d.line(40, 18, 40, 64, 4, c); // 书脊
    d.line(22, 30, 33, 30, 3, c); // 左页文字1
    d.line(22, 42, 33, 42, 3, c); // 左页文字2
    d.line(47, 30, 58, 30, 3, c); // 右页文字1
    d.line(47, 42, 58, 42, 3, c); // 右页文字2
  },
  // 统计：柱状图
  bars(d, c) {
    d.rect(14, 44, 26, 62, c);    // 柱1
    d.rect(33, 26, 45, 62, c);    // 柱2
    d.rect(52, 34, 64, 62, c);    // 柱3
    d.line(12, 64, 68, 64, 4, c); // 基线
  },
  // 我的：人形
  user(d, c) {
    d.circle(40, 24, 10, c);      // 头
    d.dome(40, 54, 16, c);        // 肩（上半圆）
  }
};

// 输出目录
const OUT_DIR = path.join(__dirname, '..', 'miniprogram', 'assets', 'tabbar');
fs.mkdirSync(OUT_DIR, { recursive: true });

// 文件名与图标、配色映射
const TARGETS = [
  ['index', 'home', 'normal'],
  ['index-active', 'home', 'active'],
  ['mistakes', 'book', 'normal'],
  ['mistakes-active', 'book', 'active'],
  ['stats', 'bars', 'normal'],
  ['stats-active', 'bars', 'active'],
  ['mine', 'user', 'normal'],
  ['mine-active', 'user', 'active']
];

TARGETS.forEach(([name, icon, colorKey]) => {
  const png = new PNG({ width: SIZE, height: SIZE });
  const draw = {
    line: (x0, y0, x1, y1, w, c) => drawLine(png, x0, y0, x1, y1, w, c),
    rect: (x0, y0, x1, y1, c) => fillRect(png, x0, y0, x1, y1, c),
    circle: (cx, cy, r, c) => fillCircle(png, cx, cy, r, c),
    dome: (cx, cy, r, c) => fillDome(png, cx, cy, r, c)
  };
  ICONS[icon](draw, COLORS[colorKey]);
  const buf = PNG.sync.write(png);
  const file = path.join(OUT_DIR, name + '.png');
  fs.writeFileSync(file, buf);
  console.log('生成 ' + file);
});
