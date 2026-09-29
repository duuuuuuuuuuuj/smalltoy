const fs = require('fs');
const path = require('path');
const { inferState } = require('./state-inferencer');
const { getAggregatedState, getSessionList } = require('./state-aggregator');

const CLAUDE_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude');
const CLAUDE_PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');

const byteOffsets = new Map();
const sessionStates = new Map();
const watchedDirs = new Set();
const activeWatchers = new Set();

let idleTimer = null;
let sleepingTimer = null;
let onStateChange = null;
let onExpGain = null;

function emitStateChange() {
  if (!onStateChange) return;
  const sessions = getSessionList(sessionStates);
  onStateChange({
    ...getAggregatedState(sessionStates),
    sessions,
  });
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  clearTimeout(sleepingTimer);
  idleTimer = setTimeout(() => {
    sessionStates.clear();
    if (onStateChange) emitStateChange();
    sleepingTimer = setTimeout(() => {
      if (onStateChange) onStateChange({ state: 'SLEEPING', activeSessions: 0, sessions: [] });
    }, 240000);
  }, 60000);
}

function updateSessionState(key, state) {
  if (state === 'DONE') {
    sessionStates.set(key, state);
    setTimeout(() => {
      sessionStates.delete(key);
      if (onStateChange) emitStateChange();
    }, 3000);
  } else {
    sessionStates.set(key, state);
  }
  if (onStateChange) emitStateChange();
}

function processJsonlChange(dirPath, dirName, filename) {
  try {
    const filePath = path.join(dirPath, filename);
    const stat = fs.statSync(filePath);
    const key = dirName + '/' + filename;
    const prevOffset = byteOffsets.get(key) || 0;
    if (stat.size <= prevOffset) { byteOffsets.set(key, stat.size); return; }

    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(stat.size - prevOffset);
    fs.readSync(fd, buf, 0, buf.length, prevOffset);
    fs.closeSync(fd);
    byteOffsets.set(key, stat.size);

    const newContent = buf.toString('utf-8');
    const lines = newContent.split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const o = JSON.parse(line);
        const state = inferState(o);
        if (state) {
          updateSessionState(key, state);
          resetIdleTimer();
          if (onExpGain) {
            let gain = 0;
            if (state === 'CODING') gain = 2;
            else if (state === 'DONE') gain = 5;
            if (gain > 0) onExpGain(gain);
          }
        }
      } catch (e) {
        console.warn('[pet] Skipping malformed JSONL line:', e.message);
      }
    }
  } catch {}
}

function scanLineCounts() {
  try {
    const now = Date.now();
    for (const dirName of fs.readdirSync(CLAUDE_PROJECTS_DIR)) {
      const dirPath = path.join(CLAUDE_PROJECTS_DIR, dirName);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      for (const f of fs.readdirSync(dirPath).filter(f => f.endsWith('.jsonl'))) {
        const filePath = path.join(dirPath, f);
        const key = dirName + '/' + f;
        const stat = fs.statSync(filePath);
        // 只回溯最近 5 分钟内修改的文件
        if (now - stat.mtimeMs > 5 * 60 * 1000) {
          byteOffsets.set(key, stat.size);
          continue;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(Boolean);
        byteOffsets.set(key, stat.size);
        // 回溯最后20行推断初始状态
        const tail = lines.slice(-20);
        for (const line of tail) {
          try {
            const o = JSON.parse(line);
            const state = inferState(o);
            if (state) sessionStates.set(key, state);
          } catch (e) {
            console.warn('[pet] Skipping malformed JSONL line during scan:', e.message);
          }
        }
      }
    }
    if (onStateChange) emitStateChange();
  } catch {}
}

function watchProjectDir(dirPath) {
  const dirName = path.basename(dirPath);
  if (watchedDirs.has(dirName)) return;
  watchedDirs.add(dirName);
  let debounceTimer = null;
  const watcher = fs.watch(dirPath, (eventType, filename) => {
    if (!filename || !filename.endsWith('.jsonl')) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => processJsonlChange(dirPath, dirName, filename), 300);
  });
  watcher.on('error', () => { activeWatchers.delete(watcher); });
  activeWatchers.add(watcher);
}

function startWatcher(handlers) {
  onStateChange = handlers.onStateChange;
  onExpGain = handlers.onExpGain;

  if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) {
    console.log('[pet] Claude projects dir not found, retrying in 10s:', CLAUDE_PROJECTS_DIR);
    setTimeout(() => startWatcher(handlers), 10000);
    return;
  }

  scanLineCounts();
  try {
    for (const dirName of fs.readdirSync(CLAUDE_PROJECTS_DIR)) {
      const dirPath = path.join(CLAUDE_PROJECTS_DIR, dirName);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      watchProjectDir(dirPath);
    }
  } catch (e) {
    console.error('[pet] Error scanning projects:', e.message);
  }

  const topWatcher = fs.watch(CLAUDE_PROJECTS_DIR, (eventType, filename) => {
    if (!filename) return;
    const dirPath = path.join(CLAUDE_PROJECTS_DIR, filename);
    try {
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) watchProjectDir(dirPath);
    } catch {}
  });
  topWatcher.on('error', () => { activeWatchers.delete(topWatcher); });
  activeWatchers.add(topWatcher);

  console.log('[pet] Global watcher started on:', CLAUDE_PROJECTS_DIR);
}

function getSessionStates() { return sessionStates; }

function closeAllWatchers() {
  for (const w of activeWatchers) w.close();
  activeWatchers.clear();
}

module.exports = {
  startWatcher,
  closeAllWatchers,
};
