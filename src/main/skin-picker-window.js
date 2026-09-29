const { BrowserWindow } = require('electron');
const path = require('path');
const { extractAnimData } = require('../sprite/sprite-extractor');

const ROOT_DIR = path.join(__dirname, '..', '..');
const preloadPath = path.join(__dirname, '..', 'ipc', 'preload.js');

let skinPickerWindow = null;

function create(settings, petState, availableSkins) {
  if (skinPickerWindow && !skinPickerWindow.isDestroyed()) {
    skinPickerWindow.focus();
    return;
  }
  skinPickerWindow = new BrowserWindow({
    width: 520, height: 480,
    frame: true, resizable: false, autoHideMenuBar: true,
    title: '选择宠物', backgroundColor: '#1a1b26',
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false },
  });
  skinPickerWindow.loadFile(path.join(ROOT_DIR, 'assets', 'skin-picker.html'));
  skinPickerWindow.on('close', () => { skinPickerWindow = null; });
}

function buildSkinPickerData(settings, petState, availableSkins) {
  const skins = [];
  for (const s of availableSkins) {
    const petData = extractAnimData(s.id, 'idle');
    skins.push({ id: s.id, label: s.label, petData });
  }
  return { current: settings.skin, exp: petState ? petState.exp : 0, skins };
}

module.exports = { create, buildSkinPickerData };
