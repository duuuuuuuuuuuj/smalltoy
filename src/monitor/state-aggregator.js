const STATE_PRIORITY = {
  CODING: 5, EXECUTING: 4, USING_TOOLS: 4,
  THINKING: 3, ANALYZING: 3, WAITING_INPUT: 3,
  DONE: 2, IDLE: 1, ERROR: 0,
};

function getAggregatedState(sessionStates) {
  let best = 'IDLE';
  let bestP = 0;
  let activeCount = 0;
  for (const [, state] of sessionStates) {
    if (state !== 'IDLE' && state !== 'DONE') activeCount++;
    const p = STATE_PRIORITY[state] || 0;
    if (p > bestP) { bestP = p; best = state; }
  }
  return { state: best, activeSessions: activeCount };
}

function getSessionList(sessionStates) {
  const projectMap = new Map();
  for (const [key, state] of sessionStates) {
    if (state === 'IDLE') continue;
    const dirName = key.split('/')[0];
    const projectName = dirName.split('-').slice(-1)[0] || dirName;
    const curP = STATE_PRIORITY[projectMap.get(projectName)] || 0;
    const newP = STATE_PRIORITY[state] || 0;
    if (newP > curP) projectMap.set(projectName, state);
  }
  const sessions = [];
  for (const [project, state] of projectMap) {
    sessions.push({ project, state });
  }
  return sessions;
}

module.exports = { getAggregatedState, getSessionList };
