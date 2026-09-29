const WALK_DIRS = ['walk_right', 'walk_left', 'walk_down', 'walk_up',
  'walk_right_down', 'walk_left_down', 'walk_right_up', 'walk_left_up'];
const WALK_DX = { walk_right: 2, walk_left: -2, walk_down: 0, walk_up: 0,
  walk_right_down: 2, walk_left_down: -2, walk_right_up: 2, walk_left_up: -2 };
const WALK_DY = { walk_right: 0, walk_left: 0, walk_down: 1, walk_up: -1,
  walk_right_down: 1, walk_left_down: 1, walk_right_up: -1, walk_left_up: -1 };

let petWindow = null;
let behaviorTimer = null;
let walkTimer = null;
let walkTarget = null;
let currentWalkDir = 'walk_right';

function init(pw) { petWindow = pw; }

function startAutoWalk() {
  if (behaviorTimer) return;
  scheduleNext();
}

function stopAutoWalk() {
  clearTimeout(behaviorTimer);
  behaviorTimer = null;
  if (walkTimer) { clearInterval(walkTimer); walkTimer = null; }
  walkTarget = null;
  const sm = require('./state-machine');
  if (sm.getBehaviorState() === 'WALKING') sm.transition('IDLE');
}

function toggleAutoWalk(enabled) {
  if (enabled) startAutoWalk();
  else stopAutoWalk();
}

function scheduleNext() {
  const delay = 5000 + Math.random() * 10000;
  behaviorTimer = setTimeout(decide, delay);
}

function decide() {
  behaviorTimer = null;
  if (!petWindow || petWindow.isDestroyed()) return;
  const roll = Math.random();
  if (roll < 0.60) doIdleAction();
  else if (roll < 0.85) doWalk();
  else if (roll < 0.95) doSleep();
  else doSpecial();
}

function doIdleAction() {
  const sm = require('./state-machine');
  const anims = ['wash_sit', 'yawn_sit', 'paw', 'scratch'];
  const anim = anims[Math.floor(Math.random() * anims.length)];
  const dur = 2000 + Math.random() * 2000;
  sm.playTempAnim(anim, dur);
  behaviorTimer = setTimeout(scheduleNext, dur);
}

function getWorkArea() {
  const { screen } = require('electron');
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  return display.workArea;
}

function doWalk() {
  const sm = require('./state-machine');
  const [cx, cy] = petWindow.getPosition();
  const [ww, wh] = petWindow.getSize();
  const b = getWorkArea();
  const minD = 50, maxD = 150;
  const dist = minD + Math.random() * (maxD - minD);
  const angle = Math.random() * Math.PI * 2;
  let tx = cx + Math.round(Math.cos(angle) * dist);
  let ty = cy + Math.round(Math.sin(angle) * dist);
  tx = Math.max(b.x, Math.min(b.x + b.width - ww, tx));
  ty = Math.max(b.y, Math.min(b.y + b.height - wh, ty));
  walkTarget = { x: tx, y: ty };
  currentWalkDir = determineDirection(cx, cy, tx, ty);
  sm.playTempAnim(currentWalkDir, 0);
  sm.transition('WALKING');
  walkTimer = setInterval(walkStep, 100);
}

function walkStep() {
  if (!petWindow || petWindow.isDestroyed() || !walkTarget) {
    if (walkTimer) { clearInterval(walkTimer); walkTimer = null; }
    return;
  }
  const [x, y] = petWindow.getPosition();
  const dx = walkTarget.x - x;
  const dy = walkTarget.y - y;
  if (Math.abs(dx) <= 5 && Math.abs(dy) <= 4) {
    clearInterval(walkTimer);
    walkTimer = null;
    walkTarget = null;
    const sm = require('./state-machine');
    sm.transition('IDLE');
    behaviorTimer = setTimeout(scheduleNext, 2000);
    return;
  }
  const newDir = determineDirection(x, y, walkTarget.x, walkTarget.y);
  if (newDir !== currentWalkDir) {
    currentWalkDir = newDir;
    require('./state-machine').playTempAnim(currentWalkDir, 0);
  }
  const mx = dx !== 0 ? Math.sign(dx) * Math.min(Math.abs(dx), 4) : 0;
  const my = dy !== 0 ? Math.sign(dy) * Math.min(Math.abs(dy), 2) : 0;
  let nx = x + mx, ny = y + my;
  const b = getWorkArea();
  const [ww, wh] = petWindow.getSize();
  nx = Math.max(b.x, Math.min(b.x + b.width - ww, nx));
  ny = Math.max(b.y, Math.min(b.y + b.height - wh, ny));
  petWindow.setPosition(nx, ny);
}

function doSleep() {
  const sm = require('./state-machine');
  sm.transition('SLEEPING');
  const dur = 10000 + Math.random() * 20000;
  behaviorTimer = setTimeout(scheduleNext, dur);
}

function doSpecial() {
  const sm = require('./state-machine');
  sm.playTempAnim('paw', 0);
  sm.transition('PLAYING');
  const dur = 2000 + Math.random() * 1000;
  behaviorTimer = setTimeout(scheduleNext, dur);
}

function determineDirection(fromX, fromY, toX, toY) {
  const dx = toX - fromX, dy = toY - fromY;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const { angleToDir } = require('../utils/direction');
  return 'walk_' + angleToDir(angle);
}

module.exports = { init, stopAutoWalk, toggleAutoWalk };
