const { getAllItems, getItem, getFrame } = require('./decoration-catalog');
const { getAll } = require('./decoration-store');

let active = false;
let petWindow = null;

function init(pw) {
  petWindow = pw;
}

function toggleEditMode(on) {
  active = typeof on === 'boolean' ? on : !active;
  if (!petWindow || petWindow.isDestroyed()) return;
  const catalog = getAllItems().map(item => {
    const frame = getFrame(item.id);
    return { id: item.id, label: item.label, type: item.type, frame };
  });
  const decorations = getAll().map(d => {
    const entry = getItem(d.catalogId);
    return {
      ...d,
      frame: entry ? getFrame(d.catalogId) : null,
      label: entry ? entry.item.label : d.catalogId,
    };
  });
  petWindow.webContents.send('pet:edit-mode', { active, catalog, decorations });
}

function isActive() {
  return active;
}

module.exports = { init, toggleEditMode, isActive };
