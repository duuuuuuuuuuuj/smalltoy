const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude-tool-electron', 'pet-cache');
const STORE_PATH = path.join(DATA_DIR, 'decorations.json');

let store = { version: 1, items: [] };

function load() {
  if (fs.existsSync(STORE_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
      if (raw && Array.isArray(raw.items)) store = raw;
    } catch (e) {
      console.warn('[pet] Failed to load decorations, using defaults:', e.message);
    }
  }
}

function save() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('[pet] Failed to save decorations:', e.message);
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

function place(catalogId, x, y) {
  const item = { id: uid(), catalogId, x, y, placedAt: Date.now(), lastInteracted: 0 };
  store.items.push(item);
  save();
  return item;
}

function remove(id) {
  const idx = store.items.findIndex(i => i.id === id);
  if (idx === -1) return false;
  store.items.splice(idx, 1);
  save();
  return true;
}

function move(id, x, y) {
  const item = store.items.find(i => i.id === id);
  if (!item) return false;
  item.x = x;
  item.y = y;
  save();
  return true;
}

function getAll() {
  return store.items;
}

function updateInteracted(id) {
  const item = store.items.find(i => i.id === id);
  if (item) { item.lastInteracted = Date.now(); save(); }
}

module.exports = { load, save, place, remove, move, getAll, updateInteracted };
