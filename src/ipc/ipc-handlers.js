const { ipcMain, Menu } = require('electron');
const { extractAnimData } = require('../sprite/sprite-extractor');
const { FOODS, feedFood } = require('../nurture/foods');

const { savePetState } = require('../nurture/pet-state');

const CLICK_REACTIONS = [
  '喵~', '不要戳我啦!', '嘻嘻~', '嗯?',
  '好舒服~', '嘿嘿嘿', '痒痒的!', '再摸摸~',
];

let dragInitCursorX = 0, dragInitCursorY = 0, dragInitWinX = 0, dragInitWinY = 0;

function registerAll(handlers) {
  const { getPetWindow, getSettings, getPetState, updateSetting,
          openSkinPicker, toggleAutoWalk, rebuildTray, equipAccessory,
          sendNurtureData, sendRandomEvent, playTempAnim,
          refreshBalance, onDeepseekKeyChanged } = handlers;

  ipcMain.on('pet:hide', () => {
    const pw = getPetWindow();
    if (pw && !pw.isDestroyed()) pw.hide();
  });

  ipcMain.on('pet:context-menu', () => {
    const pw = getPetWindow();
    if (!pw || pw.isDestroyed()) return;
    const petState = getPetState();
    const items = Object.entries(FOODS).map(([id, food]) => ({
      label: food.name + ' x' + ((petState && petState.inventory[id]) || 0),
      enabled: petState && (petState.inventory[id] || 0) > 0,
      click: () => handleFeed(id, handlers),
    }));
    Menu.buildFromTemplate(items).popup({ window: pw });
  });

  ipcMain.on('pet:skin-data', (event, skinId) => {
    const id = skinId || getSettings().skin;
    event.returnValue = extractAnimData(id, 'idle');
  });

  ipcMain.on('pet:feed', (_, foodId) => {
    if (!foodId || !FOODS[foodId]) return;
    handleFeed(foodId, handlers);
  });

  ipcMain.on('pet:click', () => {
    const reaction = CLICK_REACTIONS[Math.floor(Math.random() * CLICK_REACTIONS.length)];
    sendRandomEvent(reaction);
    playTempAnim('meow_sit', 2000);
  });

  ipcMain.on('pet:force-repaint', () => {
    const pw = getPetWindow();
    if (!pw || pw.isDestroyed()) return;
    const [w, h] = pw.getSize();
    pw.setSize(w, h + 1);
    pw.setSize(w, h);
  });

  ipcMain.on('pet:resize-content', (_, neededW, neededH) => {
    const pw = getPetWindow();
    if (!pw || pw.isDestroyed() || typeof neededH !== 'number') return;
    const sm = require('../behavior/state-machine');
    if (sm.getBehaviorState() === 'DRAGGED') return;
    const [curW, curH] = pw.getSize();
    const newW = Math.max(40, neededW || curW);
    const newH = Math.max(40, neededH);
    if (newW === curW && newH === curH) return;
    const [x, y] = pw.getPosition();
    pw.setBounds({ x, y: y + curH - newH, width: newW, height: newH });
  });

  ipcMain.on('pet:drag-move-to', (_, screenX, screenY) => {
    if (typeof screenX !== 'number' || typeof screenY !== 'number') return;
    const pw = getPetWindow();
    if (!pw || pw.isDestroyed()) return;
    const { screen } = require('electron');
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const b = display.workArea;
    const fixedW = 130, fixedH = 190;
    const nx = Math.max(b.x, Math.min(b.x + b.width - fixedW, dragInitWinX + (screenX - dragInitCursorX)));
    const ny = Math.max(b.y, Math.min(b.y + b.height - fixedH, dragInitWinY + (screenY - dragInitCursorY)));
    pw.setBounds({ x: nx, y: ny, width: fixedW, height: fixedH });
  });

  ipcMain.on('pet:drag-start', () => {
    const pw = getPetWindow();
    if (!pw || pw.isDestroyed()) return;
    const [x, y] = pw.getPosition();
    const { screen } = require('electron');
    const cursor = screen.getCursorScreenPoint();
    dragInitCursorX = cursor.x; dragInitCursorY = cursor.y;
    dragInitWinX = x; dragInitWinY = y;
    handlers.playTempAnim('dragged', 0);
  });

  ipcMain.on('pet:drag-end', () => {
    const pw = getPetWindow();
    if (pw && !pw.isDestroyed()) {
      const [x, y] = pw.getPosition();
      pw.setBounds({ x, y, width: 130, height: 190 });
    }
    handlers.transition('IDLE');
  });

  ipcMain.on('pet:set-ignore-mouse', (_, ignore) => {
    const pw = getPetWindow();
    if (!pw || pw.isDestroyed()) return;
    pw.setIgnoreMouseEvents(ignore, { forward: true });
  });

  ipcMain.handle('pet:stats-request', () => {
    const ps = getPetState();
    if (!ps) return null;
    return {
      stats: ps.stats, growthStage: ps.growthStage,
      exp: ps.exp, inventory: ps.inventory, totalRuntime: ps.totalRuntime,
    };
  });

  ipcMain.handle('skin-picker:list', () => handlers.buildSkinPickerData());

  ipcMain.on('skin-picker:select', (_, skinId) => {
    if (typeof skinId !== 'string' || !skinId) return;
    updateSetting({ skin: skinId });
    handlers.closeSkinPicker();
  });

  ipcMain.on('deco:place', (_, data) => {
    if (handlers.placeDecoration) handlers.placeDecoration(data);
  });
  ipcMain.on('deco:remove', (_, id) => {
    if (handlers.removeDecoration) handlers.removeDecoration(id);
  });
  ipcMain.on('deco:move', (_, data) => {
    if (handlers.moveDecoration) handlers.moveDecoration(data);
  });
  ipcMain.on('deco:edit-toggle', (_, active) => {
    if (handlers.toggleEditMode) handlers.toggleEditMode(active);
  });

  // Config window
  ipcMain.handle('config:get-data', () => handlers.buildConfigData());

  ipcMain.on('config:update', (_, key, value) => {
    if (!key) return;
    if (['skin', 'showBubble', 'showTooltip', 'autoWalk'].includes(key)) {
      updateSetting({ [key]: value });
      if (key === 'autoWalk') handlers.toggleAutoWalk(value);
    } else if (['stateAnimMap', 'behaviorAnimMap', 'statusMessages', 'animSpeeds'].includes(key)) {
      updateSetting({ [key]: value });
    } else if (['deepseekApiKey', 'showBalance', 'soundEnabled'].includes(key)) {
      updateSetting({ [key]: value });
      if (key === 'deepseekApiKey' && onDeepseekKeyChanged) onDeepseekKeyChanged(value);
    }
  });

  ipcMain.on('config:play-anim', (_, animName) => {
    if (typeof animName !== 'string' || !animName) return;
    playTempAnim(animName, 0);
  });

  ipcMain.on('config:follow-mouse', (_, enabled) => {
    if (handlers.toggleFollowMouse) handlers.toggleFollowMouse(enabled);
  });

  ipcMain.on('balance:refresh', () => {
    if (refreshBalance) refreshBalance();
  });
}

function handleFeed(foodId, handlers) {
  const petState = handlers.getPetState();
  if (!petState) return;
  const result = feedFood(petState, foodId);
  if (result.ok) {
    const food = FOODS[foodId];
    handlers.sendRandomEvent('吃了' + food.name + '，真好吃!');
    handlers.playTempAnim('eat', 3000);
    savePetState(petState);
    handlers.sendNurtureData();
    handlers.rebuildTray();
  } else {
    handlers.sendRandomEvent(result.reason);
  }
}

module.exports = { registerAll };
