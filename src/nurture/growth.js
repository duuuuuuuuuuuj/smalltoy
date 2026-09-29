const EXP_THRESHOLDS = [
  { min: 0, stage: 'baby' },
  { min: 500, stage: 'teen' },
  { min: 2000, stage: 'adult' },
];

const ACCESSORY_MILESTONES = {
  100: 'party_hat', 300: 'bow_tie', 600: 'crown',
  1000: 'scarf', 1500: 'glasses', 2500: 'halo',
};

function checkGrowthStage(exp) {
  let stage = 'baby';
  for (const t of EXP_THRESHOLDS) {
    if (exp >= t.min) stage = t.stage;
  }
  return stage;
}

function checkAccessoryUnlocks(state) {
  const newUnlocks = [];
  for (const [threshold, id] of Object.entries(ACCESSORY_MILESTONES)) {
    if (state.exp >= Number(threshold) && !state.unlockedAccessories.includes(id)) {
      state.unlockedAccessories.push(id);
      newUnlocks.push(id);
    }
  }
  return newUnlocks;
}

function addExp(state, amount) {
  state.exp += amount;
  state.growthStage = checkGrowthStage(state.exp);
  return checkAccessoryUnlocks(state);
}

module.exports = { checkGrowthStage, checkAccessoryUnlocks, addExp };
