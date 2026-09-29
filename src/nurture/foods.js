const FOODS = {
  carrot: { name: '胡萝卜', hunger: 25, happiness: 5, energy: 0, regenRate: 2 },
  fish:   { name: '小鱼干', hunger: 10, happiness: 20, energy: 5, regenRate: 1 },
  milk:   { name: '牛奶',   hunger: 15, happiness: 10, energy: 20, regenRate: 1 },
};

const DEFAULT_INVENTORY = { carrot: 5, fish: 3, milk: 3 };
const FOOD_REGEN_INTERVAL = 30 * 60 * 1000;

function clampStat(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function feedFood(state, foodId) {
  const food = FOODS[foodId];
  if (!food) return { ok: false, reason: 'unknown food' };
  const qty = state.inventory[foodId] || 0;
  if (qty <= 0) return { ok: false, reason: food.name + '没有了' };
  state.inventory[foodId] = qty - 1;
  for (const key of ['hunger', 'happiness', 'energy']) {
    state.stats[key] = clampStat(state.stats[key] + food[key]);
  }
  state.exp += 3;
  return { ok: true, food: foodId };
}

function regenFood(state) {
  const now = Date.now();
  const elapsed = now - (state.lastFoodRegen || now);
  if (elapsed < FOOD_REGEN_INTERVAL) return;
  for (const [id, food] of Object.entries(FOODS)) {
    state.inventory[id] = (state.inventory[id] || 0) + food.regenRate;
  }
  state.lastFoodRegen = now;
}

module.exports = { FOODS, DEFAULT_INVENTORY, clampStat, feedFood, regenFood };
