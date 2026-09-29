const { getAll } = require('./decoration-store');
const { getItem, getInteraction } = require('./decoration-catalog');
const { updateInteracted } = require('./decoration-store');

const COOLDOWN_MS = 30000;

let petWindow = null;
let petStateRef = null;
let onEvent = null;

function init(pw, getPetState, sendRandomEvent) {
  petWindow = pw;
  petStateRef = getPetState;
  onEvent = sendRandomEvent;
}

function checkInteractions(petX, petY) {
  if (!petWindow || petWindow.isDestroyed()) return null;
  const now = Date.now();
  const decorations = getAll();

  for (const deco of decorations) {
    if (now - deco.lastInteracted < COOLDOWN_MS) continue;
    const entry = getItem(deco.catalogId);
    if (!entry) continue;

    const interDef = getInteraction(entry.item.type);
    if (!interDef) continue;

    const dx = petX - deco.x;
    const dy = petY - deco.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > (interDef.radius || 80)) continue;

    updateInteracted(deco.id);

    const ps = petStateRef();
    if (ps && interDef.effect) {
      if (interDef.effect.hunger) ps.stats.hunger = Math.min(100, ps.stats.hunger + interDef.effect.hunger);
      if (interDef.effect.happiness) ps.stats.happiness = Math.min(100, ps.stats.happiness + interDef.effect.happiness);
      if (interDef.effect.energy) ps.stats.energy = Math.min(100, ps.stats.energy + interDef.effect.energy);
    }

    if (onEvent) onEvent(interDef.message);
    return { anim: interDef.anim, duration: 3000 };
  }
  return null;
}

module.exports = { init, checkInteractions };
