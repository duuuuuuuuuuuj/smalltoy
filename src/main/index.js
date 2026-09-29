const { app } = require('electron');
const path = require('path');

const { loadSettings, updateSettings, getSettings } = require('./settings');
const { createPetWindow, getPetWindow, setQuitting, resizeWindow } = require('./pet-window');
const { createTray, rebuildTrayMenu } = require('./tray-manager');
const { discoverSkins } = require('../sprite/skin-discovery');
const { startWatcher, closeAllWatchers } = require('../monitor/jsonl-watcher');
const { clampStat, regenFood } = require('../nurture/foods');
const { loadPetState, savePetState } = require('../nurture/pet-state');
const { addExp } = require('../nurture/growth');
const { checkRandomEvents } = require('../nurture/random-events');
const { init: smInit, setClaudeState, playTempAnim } = require('../behavior/state-machine');
const { init: awInit, toggleAutoWalk, stopAutoWalk } = require('../behavior/auto-walk');
const followMouse = require('../behavior/follow-mouse');
const idleBehavior = require('../behavior/idle-behavior');
const { init: greetInit, start: greetStart, stop: greetStop } = require('../behavior/greeting');
const { registerAll } = require('../ipc/ipc-handlers');
const { buildSkinPickerData, create: createSkinPicker } = require('./skin-picker-window');
const { buildConfigData, create: createConfigWindow } = require('./config-window');
const { ACCESSORIES } = require('../accessories');
const { loadAllCatalogs } = require('../decoration/decoration-catalog');
const decoStore = require('../decoration/decoration-store');
const editMode = require('../decoration/edit-mode');
const decoInteraction = require('../decoration/interaction');
const { start: startBalanceMonitor, refreshNow: refreshBalanceNow, stop: stopBalanceMonitor } = require('../deepseek/balance-monitor');

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations');
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
  app.disableHardwareAcceleration();
}

const PET_DATA_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude-tool-electron', 'pet-cache');
app.setPath('userData', PET_DATA_DIR);

let petState = null;
let availableSkins = [];
let pendingEvents = [];
let lastClaudeState = 'IDLE';
let lastSoundAt = 0;

// --- Bootstrap ---
loadSettings();
petState = loadPetState();
savePetState(petState);
availableSkins = discoverSkins();
loadAllCatalogs();
decoStore.load();

const events = checkRandomEvents(petState);
if (events.length > 0) {
  for (const ev of events) pendingEvents.push(ev);
  savePetState(petState);
}

// --- Helpers ---
function sendNurtureData() {
  const pw = getPetWindow();
  if (!pw || pw.isDestroyed() || !petState) return;
  const settings = getSettings();
  const accId = petState.equippedAccessories[settings.skin] || null;
  pw.webContents.send('pet:nurture-data', {
    stats: petState.stats,
    growthStage: petState.growthStage,
    exp: petState.exp,
    equippedAccessory: accId ? ACCESSORIES[accId] : null,
    unlockedAccessories: petState.unlockedAccessories,
    inventory: petState.inventory,
    totalRuntime: petState.totalRuntime,
  });
}

function sendRandomEvent(text) {
  const pw = getPetWindow();
  if (pw && !pw.isDestroyed()) pw.webContents.send('pet:random-event', { text });
}

function sendSettings() {
  const pw = getPetWindow();
  if (pw && !pw.isDestroyed()) pw.webContents.send('pet:settings', getSettings());
}

function sendStateSound(state) {
  const now = Date.now();
  if (now - lastSoundAt < 1200) return; // 防抖，避免状态抖动时刷屏
  if (!getSettings().soundEnabled) return;
  const pw = getPetWindow();
  if (!pw || pw.isDestroyed()) return;
  lastSoundAt = now;
  pw.webContents.send('pet:state-sound', { state });
}

function sendBalance(data) {
  const pw = getPetWindow();
  if (!pw || pw.isDestroyed()) return;
  pw.webContents.send('pet:balance', data);
}

function updateSetting(patch) {
  updateSettings(patch);
  sendSettings();
  handleRebuildTray();
}

function handleRebuildTray() {
  rebuildTrayMenu(trayHandlers);
}

const trayHandlers = {
  getSettings,
  getPetState: () => petState,
  getAvailableSkins: () => availableSkins,
  showPet: () => { const pw = getPetWindow(); if (pw) pw.show(); },
  hidePet: () => { const pw = getPetWindow(); if (pw) pw.hide(); },
  updateSetting,
  toggleAutoWalk: (enabled) => {
    toggleAutoWalk(enabled);
    if (enabled) idleBehavior.start(); else idleBehavior.stop();
  },
  openSkinPicker: () => createSkinPicker(getSettings(), petState, availableSkins),
  openConfig: () => createConfigWindow(getSettings(), availableSkins),
  toggleFollowMouse: (enabled) => { enabled ? followMouse.start() : followMouse.stop(); },
  equipAccessory: (accId) => {
    const settings = getSettings();
    petState.equippedAccessories[settings.skin] = accId;
    savePetState(petState);
    sendNurtureData();
    handleRebuildTray();
  },
  quit: () => { setQuitting(true); app.quit(); },
  feed: () => {},
  sendNurtureData,
  sendRandomEvent,
  rebuildTray: handleRebuildTray,
  playTempAnim,
  buildSkinPickerData: () => buildSkinPickerData(getSettings(), petState, availableSkins),
  closeSkinPicker: () => {},
  placeDecoration: (data) => {
    const item = decoStore.place(data.catalogId, data.x, data.y);
    editMode.toggleEditMode(true);
  },
  removeDecoration: (id) => {
    decoStore.remove(id);
    editMode.toggleEditMode(true);
  },
  moveDecoration: (data) => {
    decoStore.move(data.id, data.x, data.y);
  },
  toggleEditMode: (active) => {
    updateSetting({ editMode: active });
    editMode.toggleEditMode(active);
  },
};

// --- Main tick: decay + food regen + runtime ---
const mainTick = setInterval(() => {
  if (!petState) return;
  const now = Date.now();
  const elapsed = (now - petState.lastUpdated) / (1000 * 60 * 60);
  if (elapsed > 0.01) {
    petState.stats.hunger = clampStat(petState.stats.hunger - elapsed * 3);
    petState.stats.happiness = clampStat(petState.stats.happiness - elapsed * 2);
    petState.stats.energy = clampStat(petState.stats.energy - elapsed * 2.5);
    petState.lastUpdated = now;
  }
  regenFood(petState);
  petState.totalRuntime = (petState.totalRuntime || 0) + 300;
  if (elapsed > 0.01) {
    savePetState(petState);
    sendNurtureData();
  }
}, 5 * 60 * 1000);

// --- App ready ---
app.whenReady().then(() => {
  const settings = getSettings();
  const pw = createPetWindow(settings);

  smInit(pw);
  awInit(pw);
  followMouse.init(pw);
  greetInit(pw, () => petState);
  editMode.init(pw);
  decoInteraction.init(pw, () => petState, sendRandomEvent);

  pw.once('ready-to-show', () => {
    pw.show();
    pw.setAlwaysOnTop(true, 'floating');
    sendSettings();
    sendNurtureData();
    if (pendingEvents.length > 0) {
      setTimeout(() => {
        for (const ev of pendingEvents) sendRandomEvent(ev);
        pendingEvents.length = 0;
      }, 1000);
    }
  });

  createTray(trayHandlers);

  startWatcher({
    onStateChange: (agg) => {
      const prev = lastClaudeState;
      setClaudeState(agg.state, agg.sessions);
      if (agg.state !== prev && agg.state !== 'IDLE') sendStateSound(agg.state);
      lastClaudeState = agg.state;
    },
    onExpGain: (amount) => {
      if (petState) {
        addExp(petState, amount);
        savePetState(petState);
        sendNurtureData();
      }
    },
  });

  registerAll({
    getPetWindow, getSettings, getPetState: () => petState,
    updateSetting,
    openSkinPicker: () => createSkinPicker(getSettings(), petState, availableSkins),
    toggleAutoWalk: (enabled) => {
      toggleAutoWalk(enabled);
      if (enabled) idleBehavior.start(); else idleBehavior.stop();
    },
    rebuildTray: handleRebuildTray,
    equipAccessory: trayHandlers.equipAccessory,
    sendNurtureData, sendRandomEvent, playTempAnim,
    transition: require('../behavior/state-machine').transition,
    buildSkinPickerData: () => buildSkinPickerData(getSettings(), petState, availableSkins),
    closeSkinPicker: () => {},
    placeDecoration: trayHandlers.placeDecoration,
    removeDecoration: trayHandlers.removeDecoration,
    moveDecoration: trayHandlers.moveDecoration,
    toggleEditMode: trayHandlers.toggleEditMode,
    buildConfigData: () => buildConfigData(getSettings(), availableSkins),
    toggleFollowMouse: (enabled) => { enabled ? followMouse.start() : followMouse.stop(); },
    refreshBalance: () => refreshBalanceNow(),
    onDeepseekKeyChanged: () => refreshBalanceNow(),
  });

  startBalanceMonitor({
    getApiKey: () => getSettings().deepseekApiKey || process.env.DEEPSEEK_API_KEY || '',
    onChange: (data) => sendBalance(data),
  });

  greetStart();
  if (settings.autoWalk) {
    toggleAutoWalk(true);
    idleBehavior.start();
  }
});

app.on('before-quit', () => {
  setQuitting(true);
  clearInterval(mainTick);
  closeAllWatchers();
  stopBalanceMonitor();
  greetStop();
  stopAutoWalk();
  followMouse.stop();
  idleBehavior.stop();
  if (petState) savePetState(petState);
});

app.on('window-all-closed', () => {});

process.on('uncaughtException', (err) => {
  console.error('[pet] Uncaught exception:', err);
  const { dialog } = require('electron');
  dialog.showErrorBox('Claude Pet Error', err.message + '\n\n' + err.stack);
});
