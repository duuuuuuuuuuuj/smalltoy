const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT_DIR = path.join(__dirname, '..', '..');
const SKINS_DIR = path.join(ROOT_DIR, 'assets', 'skins');
const DECO_DIR = path.join(ROOT_DIR, 'assets', 'decorations');

function loadSpritePNG(skinDir) {
  const configPath = path.join(skinDir, 'skin.json');
  if (!fs.existsSync(configPath)) return null;
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const spritePath = path.join(skinDir, config.sprite);
  if (!fs.existsSync(spritePath)) return null;
  const pngData = PNG.sync.read(fs.readFileSync(spritePath));
  const cellW = config.cellW || 16;
  const cellH = config.cellH || cellW;
  return { config, pngData, cellW, cellH };
}

function extractFrames(pngData, cellW, cellH, row, count, speed, colOffset) {
  colOffset = colOffset || 0;
  const palette = { bg: [0, 0, 0, 0] };
  const frames = [];
  for (let f = 0; f < count; f++) {
    const pixels = [];
    for (let py = row * cellH; py < (row + 1) * cellH; py++) {
      const line = [];
      for (let px = (colOffset + f) * cellW; px < (colOffset + f + 1) * cellW; px++) {
        const idx = (py * pngData.width + px) * 4;
        const r = pngData.data[idx], g = pngData.data[idx + 1];
        const b = pngData.data[idx + 2], a = pngData.data[idx + 3];
        if (a === 0) { line.push('bg'); continue; }
        const key = r + '_' + g + '_' + b + '_' + a;
        if (!palette[key]) palette[key] = [r, g, b, a];
        line.push(key);
      }
      pixels.push(line);
    }
    frames.push({ pixels });
  }
  return { size: [cellW, cellH], palette, frames, speed: speed || 300 };
}

const animCache = new Map();
const spriteCache = new Map();

function extractAnimData(skinId, animName) {
  const cacheKey = skinId + ':' + animName;
  if (animCache.has(cacheKey)) return animCache.get(cacheKey);
  if (!spriteCache.has(skinId)) {
    spriteCache.set(skinId, loadSpritePNG(path.join(SKINS_DIR, skinId)));
  }
  const sprite = spriteCache.get(skinId);
  if (!sprite) return null;
  const anim = sprite.config.animations[animName];
  if (!anim) return null;
  const col = anim.col || 0;
  const result = extractFrames(sprite.pngData, sprite.cellW, sprite.cellH, anim.row, anim.count || 1, anim.speed, col);
  result.scale = sprite.config.scale || 3;
  result.heightFactor = (sprite.config.heightFactor != null) ? sprite.config.heightFactor : 0.79;
  result.smooth = !!sprite.config.smooth;
  animCache.set(cacheKey, result);
  return result;
}

function clearSkinCache() {
  animCache.clear();
  spriteCache.clear();
}

function extractDecoFrame(decoDir, col, row, count, speed) {
  const cache = require('./sprite-cache');
  const cacheKey = 'deco:' + decoDir;
  if (!cache.has(cacheKey)) {
    const baseDir = path.join(DECO_DIR, decoDir);
    const catalogPath = path.join(baseDir, 'catalog.json');
    if (!fs.existsSync(catalogPath)) return null;
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    const spritePath = path.join(baseDir, catalog.sprite);
    if (!fs.existsSync(spritePath)) return null;
    const pngData = PNG.sync.read(fs.readFileSync(spritePath));
    cache.set(cacheKey, { pngData, cellW: catalog.cellW || 32, cellH: catalog.cellH || 32 });
  }
  const s = cache.get(cacheKey);
  if (!s) return null;
  return extractFrames(s.pngData, s.cellW, s.cellH, row, count, speed);
}

module.exports = { SKINS_DIR, DECO_DIR, extractAnimData, extractDecoFrame, clearSkinCache };
