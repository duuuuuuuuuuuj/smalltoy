const fs = require('fs');
const path = require('path');

const PET_DATA_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME,
  '.claude-tool-electron', 'pet-cache'
);
const SETTINGS_PATH = path.join(PET_DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  skin: 'gray_cat',
  showBubble: true,
  showTooltip: true,
  autoWalk: false,
  editMode: false,
  soundEnabled: true,
  showBalance: true,
  deepseekApiKey: '',
};

let settings = { ...DEFAULT_SETTINGS };

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
      settings = { ...DEFAULT_SETTINGS, ...data };
    }
  } catch (e) {
    console.warn('[pet] Failed to load settings, using defaults:', e.message);
  }
}

function saveSettings() {
  try {
    if (!fs.existsSync(PET_DATA_DIR)) fs.mkdirSync(PET_DATA_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.error('[pet] Failed to save settings:', e.message);
  }
}

function getSettings() {
  return settings;
}

function updateSettings(patch) {
  Object.assign(settings, patch);
  saveSettings();
  return settings;
}

module.exports = {
  PET_DATA_DIR,
  loadSettings,
  getSettings,
  updateSettings,
};
