const { BrowserWindow } = require('electron');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const preloadPath = path.join(__dirname, '..', 'ipc', 'preload.js');

let petWindow = null;
let isQuitting = false;

function createPetWindow(settings) {
  const size = [130, 190];
  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  const b = display.workArea;
  const x = b.x + b.width - size[0] - 10;
  const y = b.y + b.height - size[1] - 6;
  petWindow = new BrowserWindow({
    width: size[0], height: size[1],
    x, y,
    frame: false, transparent: true, alwaysOnTop: true,
    resizable: false, skipTaskbar: true, show: false,
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false },
  });
  petWindow.loadFile(path.join(ROOT_DIR, 'assets', 'pet.html'));
  petWindow.setIgnoreMouseEvents(true, { forward: true });
  petWindow.on('close', (e) => {
    if (!isQuitting) { e.preventDefault(); petWindow.hide(); }
  });
  return petWindow;
}

function forceRepaint() {
  if (!petWindow || petWindow.isDestroyed()) return;
  const [w, h] = petWindow.getSize();
  petWindow.setSize(w, h + 1);
  petWindow.setSize(w, h);
}

function getPetWindow() { return petWindow; }
function setQuitting(v) { isQuitting = v; }

function resizeWindow(settings) {
  if (!petWindow || petWindow.isDestroyed()) return;
  petWindow.setSize(130, 190);
}

module.exports = { createPetWindow, getPetWindow, setQuitting, resizeWindow, forceRepaint };
