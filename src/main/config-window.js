const { BrowserWindow } = require('electron');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const preloadPath = path.join(__dirname, '..', 'ipc', 'preload.js');

let configWindow = null;

const ALL_ANIMS = [
  'idle',
  'sit_down', 'sit_up', 'sit_left', 'sit_right', 'sit_left_down', 'sit_right_down',
  'stand_down', 'stand_up', 'stand_left', 'stand_right', 'stand_left_down', 'stand_right_down', 'stand_right_up', 'stand_left_up',
  'lie_down', 'lie_up', 'lie_left', 'lie_right', 'lie_left_down', 'lie_right_down',
  'walk_down', 'walk_up', 'walk_right', 'walk_left',
  'walk_right_down', 'walk_left_down', 'walk_right_up', 'walk_left_up',
  'sleep_left', 'sleep_right',
  'sleep_2_left', 'sleep_2_right', 'sleep_3_left', 'sleep_3_right',
  'sleep_4_left', 'sleep_4_right',
  'eat_down', 'eat_up', 'eat_left', 'eat_right',
  'eat_right_down', 'eat_left_down', 'eat_right_up', 'eat_left_up',
  'meow_sit', 'meow_stand', 'meow_sit_2', 'meow_lie',
  'yawn_sit', 'yawn_stand', 'yawn_sit_2', 'yawn_lie',
  'wash_sit', 'wash_stand', 'wash_lie',
  'scratch_left', 'scratch_right',
  'hiss_left', 'hiss_right',
  'dragged',
  'paw_down', 'paw_up', 'paw_left', 'paw_right',
  'paw_right_down', 'paw_left_down', 'paw_right_up', 'paw_left_up',
  'hind_legs',
];

const CLAUDE_STATES = [
  'IDLE', 'THINKING', 'ANALYZING', 'CODING', 'EXECUTING',
  'USING_TOOLS', 'DONE', 'ERROR', 'HAPPY', 'SLEEPING',
];

const BEHAVIOR_STATES = [
  'IDLE', 'SLEEPING', 'EATING', 'PLAYING', 'DRAGGED', 'GREETING',
];

const DEFAULT_STATE_ANIM_MAP = {
  IDLE: 'sit', THINKING: 'yawn_sit', ANALYZING: 'yawn_sit',
  CODING: 'scratch', EXECUTING: 'paw', USING_TOOLS: 'paw',
  DONE: 'meow_sit', ERROR: 'hiss', HAPPY: 'meow_sit', SLEEPING: 'sleep',
};

const DEFAULT_BEHAVIOR_ANIM_MAP = {
  IDLE: ['sit', 'stand', 'lie'],
  SLEEPING: ['sleep', 'sleep_2', 'sleep_3', 'sleep_4'], EATING: ['eat'],
  PLAYING: ['paw'], DRAGGED: ['dragged'], GREETING: ['yawn_sit'],
};

const DEFAULT_STATUS_MESSAGES = {
  IDLE: ['空闲中~'], THINKING: ['让我想想...', '思考中...', '大脑运转中...'],
  ANALYZING: ['深入分析中...', '解析中...'], CODING: ['正在写代码...', 'Coding中...'],
  EXECUTING: ['执行命令中...', '运行ing...'], USING_TOOLS: ['子代理运行中...', '调度代理中...'],
  DONE: ['搞定!', '完成啦!', '大功告成!'], ERROR: ['哎呀，出错了...', '呜呜...'],
  HAPPY: ['太棒了!', '嘿嘿~'], SLEEPING: ['呼噜呼噜...', 'ZZZ...'],
};

function create(settings, availableSkins) {
  if (configWindow && !configWindow.isDestroyed()) {
    configWindow.focus();
    return;
  }
  configWindow = new BrowserWindow({
    width: 520, height: 620,
    frame: true, resizable: false, autoHideMenuBar: true,
    title: '设置', backgroundColor: '#1a1b26',
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false },
  });
  configWindow.loadFile(path.join(ROOT_DIR, 'assets', 'config.html'));
  configWindow.on('close', () => { configWindow = null; });
}

function buildConfigData(settings, availableSkins) {
  const skins = availableSkins.map(s => ({ id: s.id, label: s.label }));
  return {
    settings: {
      skin: settings.skin,
      showBubble: settings.showBubble,
      showTooltip: settings.showTooltip,
      autoWalk: settings.autoWalk,
      soundEnabled: settings.soundEnabled,
      showBalance: settings.showBalance,
      deepseekApiKey: settings.deepseekApiKey || '',
    },
    skins,
    allAnims: ALL_ANIMS,
    claudeStates: CLAUDE_STATES,
    behaviorStates: BEHAVIOR_STATES,
    stateAnimMap: settings.stateAnimMap || { ...DEFAULT_STATE_ANIM_MAP },
    behaviorAnimMap: settings.behaviorAnimMap || { ...DEFAULT_BEHAVIOR_ANIM_MAP },
    statusMessages: settings.statusMessages || { ...DEFAULT_STATUS_MESSAGES },
    animSpeeds: settings.animSpeeds || {},
  };
}

module.exports = { create, buildConfigData };
