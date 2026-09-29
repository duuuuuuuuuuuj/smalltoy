const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC = 'C:/Users/duuuu/Desktop/生成二次元风格三视图1.png';
const SKIN = 'anime_girl';
const CROP_TOP = 0.5; // 只保留顶部 50% 高度（上半身）；留更少改 0.4、更多改 0.6
const ROOT = 'C:/Users/duuuu/ClaudePet/claude-pet-main';
const OUT = path.join(ROOT, 'assets', 'skins', SKIN);
fs.mkdirSync(OUT, { recursive: true });

// ---------- 读原图 ----------
const p = PNG.sync.read(fs.readFileSync(SRC));
const W = p.width, H = p.height;
const at = (x, y) => y * W + x;
function px(x, y) { const i = at(x, y) * 4; return [p.data[i], p.data[i + 1], p.data[i + 2]]; }
function dsum(a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); }

// ---------- 洪泛填充：从四边去掉近白背景 ----------
const TOL = 28; // 相邻像素 RGB 分量差之和的阈值
const bgMask = new Uint8Array(W * H);
const stack = [];
function seed(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = at(x, y); if (bgMask[i]) return;
  bgMask[i] = 1; stack.push(i);
}
for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
while (stack.length) {
  const i = stack.pop();
  const x = i % W, y = (i / W) | 0;
  const c = px(x, y);
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let k = 0; k < 4; k++) {
    const nx = x + nb[k][0], ny = y + nb[k][1];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const ni = at(nx, ny);
    if (bgMask[ni]) continue;
    if (dsum(c, px(nx, ny)) <= TOL) { bgMask[ni] = 1; stack.push(ni); }
  }
}

// ---------- 去除孤立小杂点（面积 < 阈值的连通块标为背景） ----------
{
  const MIN_AREA = 300;
  const visited = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (bgMask[i] || visited[i]) continue;
    const comp = [], st2 = [i];
    visited[i] = 1;
    while (st2.length) {
      const c = st2.pop();
      comp.push(c);
      const x = c % W, y = (c / W) | 0;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (let k = 0; k < 4; k++) {
        const nx = x + nb[k][0], ny = y + nb[k][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = at(nx, ny);
        if (bgMask[ni] || visited[ni]) continue;
        visited[ni] = 1; st2.push(ni);
      }
    }
    if (comp.length < MIN_AREA) for (const c of comp) bgMask[c] = 1;
  }
}

// ---------- 裁出三视图（列范围来自分析） ----------
const colRanges = [[24, 607], [624, 1007], [1019, 1525]];
const views = colRanges.map(([x0, x1]) => {
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) for (let x = x0; x <= x1; x++) {
    if (!bgMask[at(x, y)]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxY > 1420) maxY = 1420; // 排除底部水印条
  maxY = minY + Math.round((maxY - minY) * CROP_TOP); // 只保留顶部（上半身）
  return { x0: minX, y0: minY, x1: maxX, y1: maxY };
});

function crop(v) {
  const w = v.x1 - v.x0 + 1, h = v.y1 - v.y0 + 1;
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = at(v.x0 + x, v.y0 + y), di = (y * w + x) * 4;
    out.data[di] = p.data[si * 4];
    out.data[di + 1] = p.data[si * 4 + 1];
    out.data[di + 2] = p.data[si * 4 + 2];
    out.data[di + 3] = bgMask[si] ? 0 : 255;
  }
  return out;
}
const crops = [crop(views[0]), crop(views[1]), crop(views[2])];
const previewNames = ['preview_front', 'preview_side', 'preview_back'];
crops.forEach((c, i) => fs.writeFileSync(path.join(OUT, previewNames[i] + '.png'), PNG.sync.write(c)));

function mirror(img) {
  const out = new PNG({ width: img.width, height: img.height });
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const si = (y * img.width + x) * 4;
    const di = (y * img.width + (img.width - 1 - x)) * 4;
    for (let c = 0; c < 4; c++) out.data[di + c] = img.data[si + c];
  }
  return out;
}

// 在品红底上拼一张对照图，方便肉眼看抠图边缘（残留白边/破洞一目了然）
{
  const gap = 12, pad = 20;
  const tw = crops.reduce((s, c) => s + c.width, 0) + gap * 2 + pad * 2;
  const th = Math.max(...crops.map(c => c.height)) + pad * 2;
  const comp = new PNG({ width: tw, height: th });
  for (let i = 0; i < tw * th; i++) { comp.data[i * 4] = 255; comp.data[i * 4 + 1] = 0; comp.data[i * 4 + 2] = 255; comp.data[i * 4 + 3] = 255; }
  let cx = pad;
  crops.forEach(c => {
    const oy = Math.floor((th - c.height) / 2);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const si = (y * c.width + x) * 4, di = ((oy + y) * tw + (cx + x)) * 4;
      const a = c.data[si + 3] / 255;
      comp.data[di] = Math.round(c.data[si] * a + 255 * (1 - a));
      comp.data[di + 1] = Math.round(c.data[si + 1] * a + 0 * (1 - a));
      comp.data[di + 2] = Math.round(c.data[si + 2] * a + 255 * (1 - a));
      comp.data[di + 3] = 255;
    }
    cx += c.width + gap;
  });
  fs.writeFileSync(path.join(OUT, 'preview_check.png'), PNG.sync.write(comp));
}

// ---------- 合成精灵图：1 行 4 列 = 正面 / 右侧 / 左侧(镜像) / 背面 ----------
const cellW = 320, cellH = 320; // 半身像接近正方形
const sheet = new PNG({ width: cellW * 4, height: cellH });
const order = [crops[0], crops[1], mirror(crops[1]), crops[2]];

function drawScaled(dst, img, ox, oy) {
  const scale = Math.min((cellW * 0.92) / img.width, (cellH * 0.92) / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const dx = Math.round((cellW - w) / 2), dy = Math.round((cellH - h) / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx0 = Math.floor(x / scale), sy0 = Math.floor(y / scale);
    const sx1 = Math.min(img.width - 1, Math.floor((x + 1) / scale));
    const sy1 = Math.min(img.height - 1, Math.floor((y + 1) / scale));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let sy = sy0; sy <= sy1; sy++) for (let sx = sx0; sx <= sx1; sx++) {
      const si = (sy * img.width + sx) * 4, al = img.data[si + 3] / 255;
      r += img.data[si] * al; g += img.data[si + 1] * al; b += img.data[si + 2] * al; a += img.data[si + 3]; n++;
    }
    const di = ((oy + dy + y) * dst.width + (ox + dx + x)) * 4;
    if (a > 0) {
      dst.data[di] = Math.round(r / (a / 255));
      dst.data[di + 1] = Math.round(g / (a / 255));
      dst.data[di + 2] = Math.round(b / (a / 255));
      dst.data[di + 3] = Math.round(a / n);
    }
  }
}
order.forEach((c, ci) => drawScaled(sheet, c, ci * cellW, 0));
fs.writeFileSync(path.join(OUT, 'sprite.png'), PNG.sync.write(sheet));

// ---------- 生成 skin.json（复用白猫全部动画名，按朝向映射到 4 列） ----------
const catSkin = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'skins', 'white_cat', 'skin.json'), 'utf-8'));
function colFor(name) {
  if (name === 'idle') return 0;
  const dirs = ['left_down', 'right_down', 'left_up', 'right_up', 'left', 'right', 'up', 'down'];
  for (const d of dirs) {
    if (name.endsWith('_' + d)) {
      if (d === 'left' || d === 'left_down' || d === 'left_up') return 2; // 左
      if (d === 'right' || d === 'right_down' || d === 'right_up') return 1; // 右
      if (d === 'up') return 3; // 背
      return 0; // 正
    }
  }
  return 0;
}
const anims = {};
for (const name of Object.keys(catSkin.animations)) {
  anims[name] = { row: 0, col: colFor(name), count: 1, speed: 300 };
}
const skinJson = {
  name: '二次元拟物娘', sprite: 'sprite.png', cellW, cellH,
  scale: 0.2, heightFactor: 1.0, smooth: true,
  defaultAnim: 'idle', animations: anims,
};
fs.writeFileSync(path.join(OUT, 'skin.json'), JSON.stringify(skinJson, null, 2));

// ---------- 汇总 ----------
console.log('三视图包围盒:', views.map(v => `(${v.x0},${v.y0})-(${v.x1},${v.y1}) ${v.x1 - v.x0 + 1}x${v.y1 - v.y0 + 1}`).join('  '));
console.log('精灵图:', sheet.width + 'x' + sheet.height, ' cell=' + cellW + 'x' + cellH);
console.log('动画数:', Object.keys(anims).length);
console.log('输出目录:', OUT);
console.log('请打开 preview_check.png 检查抠图质量（品红底，残留白边/破洞一眼可见）');
