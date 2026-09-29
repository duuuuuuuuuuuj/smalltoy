const STATE_ANIM_MAP = {
  IDLE: 'sit', THINKING: 'yawn_sit', ANALYZING: 'yawn_sit',
  CODING: 'scratch', EXECUTING: 'paw', USING_TOOLS: 'paw',
  DONE: 'meow_sit', ERROR: 'hiss', HAPPY: 'hind_legs', SLEEPING: 'sleep',
};

const BEHAVIOR_ANIM_MAP = {
  IDLE: ['sit', 'stand', 'lie'],
  WALKING: null,
  SLEEPING: ['sleep', 'sleep_2', 'sleep_3', 'sleep_4'],
  EATING: ['eat'],
  PLAYING: ['paw'],
  DRAGGED: ['dragged'],
  GREETING: ['yawn_sit'],
};

const ANIM_DIRS = {
  sit:     ['down', 'up', 'left', 'right', 'left_down', 'right_down'],
  stand:   ['down', 'up', 'left', 'right', 'left_down', 'right_down', 'right_up', 'left_up'],
  lie:     ['down', 'up', 'left', 'right', 'left_down', 'right_down'],
  sleep:   ['left', 'right'],
  sleep_2: ['left', 'right'],
  sleep_3: ['left', 'right'],
  sleep_4: ['left', 'right'],
  eat:     ['down', 'up', 'left', 'right', 'left_down', 'right_down', 'right_up', 'left_up'],
  scratch: ['left', 'right'],
  hiss:    ['left', 'right'],
  paw:     ['down', 'up', 'left', 'right', 'left_down', 'right_down', 'right_up', 'left_up'],
};

const DIR_ANGLES = {
  right: 0, right_down: 45, down: 90, left_down: 135,
  left: 180, left_up: -135, up: -90, right_up: -45,
};

let currentBehavior = 'IDLE';
let claudeState = 'IDLE';
let currentSessions = [];
let petWindow = null;
let facingDir = 'down';
let animGeneration = 0;

function init(pw) {
  petWindow = pw;
}

function setClaudeState(state, sessions) {
  claudeState = state;
  currentSessions = sessions || [];
  sendBubbleUpdate();
}

function getBehaviorState() { return currentBehavior; }

function angleDiff(a, b) {
  let d = Math.abs(a - b);
  if (d > 180) d = 360 - d;
  return d;
}

function closestDir(target, available) {
  const tAngle = DIR_ANGLES[target];
  let best = null;
  let bestDiff = Infinity;
  for (const d of available) {
    const diff = angleDiff(tAngle, DIR_ANGLES[d]);
    if (diff < bestDiff || (diff === bestDiff && d.startsWith('right'))) {
      bestDiff = diff;
      best = d;
    }
  }
  return best;
}

function updateFacing(animName) {
  if (!animName.startsWith('walk_')) return;
  facingDir = animName.slice(5);
}

function resolveDirectionalAnim(animName) {
  const dirs = ANIM_DIRS[animName];
  if (!dirs) return animName;
  if (dirs.includes(facingDir)) return animName + '_' + facingDir;
  const fallback = closestDir(facingDir, dirs);
  return animName + '_' + fallback;
}

function pickAnim(map, state) {
  const val = map[state];
  if (!val) return null;
  if (Array.isArray(val)) return val[Math.floor(Math.random() * val.length)];
  return val;
}

function faceScreenCenter() {
  if (!petWindow || petWindow.isDestroyed()) { facingDir = 'down'; return; }
  const { screen } = require('electron');
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const cx = display.workArea.x + display.workArea.width / 2;
  const cy = display.workArea.y + display.workArea.height / 2;
  const [px, py] = petWindow.getPosition();
  const [ww, wh] = petWindow.getSize();
  const dx = cx - (px + ww / 2), dy = cy - (py + wh / 2);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const { angleToDir } = require('../utils/direction');
  facingDir = angleToDir(angle);
}

function transition(newState) {
  currentBehavior = newState;
  if (newState !== 'WALKING') faceScreenCenter();
  const { getSettings } = require('../main/settings');
  const bam = getSettings().behaviorAnimMap || BEHAVIOR_ANIM_MAP;
  let anim = pickAnim(bam, newState);
  if (anim) {
    anim = resolveDirectionalAnim(anim);
    sendCanvasAnim(anim, 0);
  } else {
    sendBubbleUpdate();
  }
}

function sendBubbleUpdate() {
  if (!petWindow || petWindow.isDestroyed()) return;
  petWindow.webContents.send('pet:status', {
    state: claudeState, animData: null, tempAnim: false,
    activeSessions: 0, behavior: currentBehavior,
    sessions: currentSessions,
  });
}

function extractAndSend(animName, durationMs, resolveFirst) {
  if (!petWindow || petWindow.isDestroyed()) return;
  animGeneration++;
  const gen = animGeneration;
  const { extractAnimData } = require('../sprite/sprite-extractor');
  const { getSettings } = require('../main/settings');
  const skin = getSettings().skin;
  let resolved = resolveFirst ? resolveDirectionalAnim(animName) : animName;
  let animData = extractAnimData(skin, resolved);
  if (!animData) animData = extractAnimData(skin, animName);
  if (!animData) {
    const base = animName.replace(/_(down|up|left|right|left_down|right_down|left_up|right_up)$/, '');
    animData = extractAnimData(skin, base);
  }
  if (!animData) return;
  const speedOverride = getSettings().animSpeeds && getSettings().animSpeeds[animName];
  if (speedOverride) animData.speed = speedOverride;
  updateFacing(animName);
  petWindow.webContents.send('pet:status', {
    state: claudeState, animData, tempAnim: durationMs > 0,
    activeSessions: 0, behavior: currentBehavior, sessions: currentSessions,
  });
  if (durationMs) {
    setTimeout(() => {
      if (animGeneration !== gen) return;
      const bam = getSettings().behaviorAnimMap || BEHAVIOR_ANIM_MAP;
      let nextAnim = pickAnim(bam, currentBehavior) || 'sit';
      nextAnim = resolveDirectionalAnim(nextAnim);
      extractAndSend(nextAnim, 0, false);
    }, durationMs);
  }
}

function sendCanvasAnim(animName, durationMs) {
  extractAndSend(animName, durationMs, false);
}

function playTempAnim(animName, durationMs) {
  extractAndSend(animName, durationMs || 0, true);
}

function lookAt(dir) {
  facingDir = dir;
  const { getSettings } = require('../main/settings');
  const bam = getSettings().behaviorAnimMap || BEHAVIOR_ANIM_MAP;
  let anim = pickAnim(bam, currentBehavior) || 'sit';
  anim = resolveDirectionalAnim(anim);
  sendCanvasAnim(anim, 0);
}

module.exports = {
  init, setClaudeState, getBehaviorState,
  transition, playTempAnim, lookAt,
};
