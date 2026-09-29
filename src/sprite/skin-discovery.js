const fs = require('fs');
const path = require('path');
const { SKINS_DIR } = require('./sprite-extractor');

function discoverSkins() {
  const skins = [];
  try {
    for (const name of fs.readdirSync(SKINS_DIR)) {
      const dir = path.join(SKINS_DIR, name);
      if (!fs.statSync(dir).isDirectory()) continue;
      const metaPath = path.join(dir, 'skin.json');
      let label = name;
      if (fs.existsSync(metaPath)) {
        try { label = JSON.parse(fs.readFileSync(metaPath, 'utf-8')).name || name; } catch (e) { console.warn('[pet] Failed to parse skin meta for', name + ':', e.message); }
      }
      skins.push({ id: name, label });
    }
  } catch {}
  if (skins.length === 0) skins.push({ id: 'cat', label: '猫咪' });
  return skins;
}

module.exports = { discoverSkins };
