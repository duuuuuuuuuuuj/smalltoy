const fs = require('fs');
const path = require('path');
const { PET_DATA_DIR } = require('../main/settings');
const { clampStat, DEFAULT_INVENTORY } = require('./foods');
const { checkGrowthStage, checkAccessoryUnlocks } = require('./growth');

const PET_STATE_PATH = path.join(PET_DATA_DIR, 'pet-state.json');
const DECAY_RATES = { hunger: 3, happiness: 2, energy: 2.5 };

const DEFAULT_STATE = {
  stats: { hunger: 100, happiness: 100, energy: 100 },
  exp: 0,
  growthStage: 'baby',
  lastUpdated: Date.now(),
  lastFoodRegen: Date.now(),
  cooldowns: {},
  equippedAccessories: {},
  unlockedAccessories: [],
  inventory: { ...DEFAULT_INVENTORY },
  totalRuntime: 0,
};

function applyDecay(state) {
  const now = Date.now();
  const elapsedHours = (now - state.lastUpdated) / (1000 * 60 * 60);
  if (elapsedHours <= 0) { state.lastUpdated = now; return state; }
  for (const key of ['hunger', 'happiness', 'energy']) {
    state.stats[key] = clampStat(state.stats[key] - elapsedHours * DECAY_RATES[key]);
  }
  state.lastUpdated = now;
  return state;
}

function loadPetState() {
  try {
    if (fs.existsSync(PET_STATE_PATH)) {
      const data = JSON.parse(fs.readFileSync(PET_STATE_PATH, 'utf-8'));
      return applyDecay({
        ...DEFAULT_STATE, ...data,
        stats: { ...DEFAULT_STATE.stats, ...(data.stats || {}) },
        cooldowns: { ...DEFAULT_STATE.cooldowns, ...(data.cooldowns || {}) },
        inventory: { ...DEFAULT_STATE.inventory, ...(data.inventory || {}) },
      });
    }
  } catch (e) {
    console.warn('[pet] Failed to load pet state, using defaults:', e.message);
  }
  return {
    ...DEFAULT_STATE,
    stats: { ...DEFAULT_STATE.stats },
    cooldowns: { ...DEFAULT_STATE.cooldowns },
    equippedAccessories: {},
    unlockedAccessories: [],
    inventory: { ...DEFAULT_INVENTORY },
  };
}

function savePetState(state) {
  try {
    if (!fs.existsSync(PET_DATA_DIR)) fs.mkdirSync(PET_DATA_DIR, { recursive: true });
    state.lastUpdated = Date.now();
    fs.writeFileSync(PET_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('[pet] Failed to save pet state:', e.message);
  }
}

module.exports = {
  loadPetState, savePetState,
};
