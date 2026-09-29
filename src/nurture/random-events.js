const { clampStat } = require('./foods');

const RANDOM_EVENTS = [
  { text: '找到零食了!', hunger: 15, happiness: 0, energy: 0 },
  { text: '做了个好梦~', hunger: 0, happiness: 0, energy: 10 },
  { text: '交到了新朋友!', hunger: 0, happiness: 10, energy: 0 },
  { text: '探索了新地方!', hunger: -5, happiness: 15, energy: -5 },
  { text: '发现了闪亮的东西!', hunger: 0, happiness: 5, energy: 0 },
  { text: '晒了会太阳~', hunger: 0, happiness: 5, energy: 5 },
  { text: '偷偷打了个盹', hunger: 0, happiness: 0, energy: 8 },
];

function checkRandomEvents(petState) {
  const absenceMin = Math.floor((Date.now() - petState.lastUpdated) / 60000);
  if (absenceMin < 30) return [];
  const events = [];
  const count = absenceMin > 120 ? 2 : 1;
  const shuffled = [...RANDOM_EVENTS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < count && i < shuffled.length; i++) {
    const ev = shuffled[i];
    petState.stats.hunger = clampStat(petState.stats.hunger + ev.hunger);
    petState.stats.happiness = clampStat(petState.stats.happiness + ev.happiness);
    petState.stats.energy = clampStat(petState.stats.energy + ev.energy);
    events.push(ev.text);
  }
  return events;
}

module.exports = { checkRandomEvents };
