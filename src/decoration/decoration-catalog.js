const fs = require('fs');
const path = require('path');
const { DECO_DIR, extractDecoFrame } = require('../sprite/sprite-extractor');

const catalogs = new Map();

function loadCatalog(decoDir) {
  if (catalogs.has(decoDir)) return catalogs.get(decoDir);
  const base = path.join(DECO_DIR, decoDir);
  const catalogPath = path.join(base, 'catalog.json');
  if (!fs.existsSync(catalogPath)) return null;
  const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  const catalog = { dir: decoDir, cellW: raw.cellW || 32, cellH: raw.cellH || 32, items: raw.items, interactions: raw.interactions || {} };
  catalogs.set(decoDir, catalog);
  return catalog;
}

function loadAllCatalogs() {
  if (!fs.existsSync(DECO_DIR)) return;
  for (const dir of fs.readdirSync(DECO_DIR)) {
    const stat = fs.statSync(path.join(DECO_DIR, dir));
    if (stat.isDirectory()) loadCatalog(dir);
  }
}

function getItem(itemId) {
  for (const [, catalog] of catalogs) {
    if (catalog.items[itemId]) {
      return { catalog, item: catalog.items[itemId], id: itemId };
    }
  }
  return null;
}

function getFrame(itemId) {
  const entry = getItem(itemId);
  if (!entry) return null;
  const { catalog, item } = entry;
  return extractDecoFrame(catalog.dir, item.col, item.row, 1, 0);
}

function getAllItems() {
  const result = [];
  for (const [dir, catalog] of catalogs) {
    for (const [id, item] of Object.entries(catalog.items)) {
      result.push({ id, ...item, decoDir: dir });
    }
  }
  return result;
}

function getInteraction(type) {
  for (const [, catalog] of catalogs) {
    if (catalog.interactions[type]) return catalog.interactions[type];
  }
  return null;
}

module.exports = { loadAllCatalogs, getItem, getFrame, getAllItems, getInteraction };
