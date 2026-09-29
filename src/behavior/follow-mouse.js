const DIRS_8 = [
  { name: 'walk_right', dx: 3, dy: 0 },
  { name: 'walk_left', dx: -3, dy: 0 },
  { name: 'walk_down', dx: 0, dy: 3 },
  { name: 'walk_up', dx: 0, dy: -3 },
  { name: 'walk_right', dx: 2, dy: 2 },
  { name: 'walk_left', dx: -2, dy: 2 },
  { name: 'walk_right', dx: 2, dy: -2 },
  { name: 'walk_left', dx: -2, dy: -2 },
];

const { angleToDir } = require('../utils/direction');

let petWindow = null;
let followTimer = null;
let currentDir = 'walk_right';

function init(pw) { petWindow = pw; }

function start() {
  if (followTimer) return;
  followTimer = setInterval(step, 100);
}

function stop() {
  if (followTimer) { clearInterval(followTimer); followTimer = null; }
}

function step() {
  if (!petWindow || petWindow.isDestroyed()) { stop(); return; }
  const { screen } = require('electron');
  const mouse = screen.getCursorScreenPoint();
  const b = screen.getDisplayNearestPoint(mouse).workArea;
  const [ww, wh] = petWindow.getSize();
  const [x, y] = petWindow.getPosition();
  const dx = mouse.x - (x + ww / 2);
  const dy = mouse.y - (y + wh / 2);
  if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;
  const dir = pickDirection(dx, dy);
  const mx = Math.sign(dx) * Math.min(Math.abs(dx), 3);
  const my = Math.sign(dy) * Math.min(Math.abs(dy), 3);
  let nx = Math.round(x + mx);
  let ny = Math.round(y + my);
  nx = Math.max(b.x, Math.min(b.x + b.width - ww, nx));
  ny = Math.max(b.y, Math.min(b.y + b.height - wh, ny));
  if (dir !== currentDir) {
    currentDir = dir;
    require('./state-machine').playTempAnim(currentDir, 0);
  }
  petWindow.setPosition(nx, ny);
}

function pickDirection(dx, dy) {
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return 'walk_' + angleToDir(angle);
}

module.exports = { init, start, stop };
