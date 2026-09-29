const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
let tray = null;

function createTray(handlers) {
  const icon = nativeImage.createFromPath(path.join(ROOT_DIR, 'assets', 'icon.png'));
  tray = new Tray(icon);
  tray.setToolTip('Claude Pet');
  rebuildTrayMenu(handlers);
  tray.on('double-click', () => handlers.showPet());
  return tray;
}

function rebuildTrayMenu(handlers) {
  if (!tray) return;
  const settings = handlers.getSettings();

  const template = [
    { label: '设置', click: () => handlers.openConfig() },
    { type: 'separator' },
    { label: '自主行走', type: 'checkbox', checked: settings.autoWalk,
      click: (item) => { handlers.updateSetting({ autoWalk: item.checked }); handlers.toggleAutoWalk(item.checked); } },
    { type: 'separator' },
    { label: '退出', click: () => handlers.quit() },
  ];
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

module.exports = { createTray, rebuildTrayMenu };
