const IDLE_ANIMS = ['wash_sit', 'yawn_sit', 'meow_sit', 'scratch', 'paw'];
const OBSERVE_DIRS = ['down', 'left', 'right', 'left_down', 'right_down', 'up'];

let timer = null;
let enabled = false;

function start() {
  stop();
  enabled = true;
  schedule();
}

function stop() {
  clearTimeout(timer);
  timer = null;
  enabled = false;
}

function schedule() {
  const delay = (8 + Math.random() * 15) * 1000;
  timer = setTimeout(() => {
    if (!enabled) return;
    const { getSettings } = require('../main/settings');
    if (getSettings().autoWalk) { schedule(); return; }
    if (Math.random() < 0.3) {
      require('./state-machine').lookAt(OBSERVE_DIRS[Math.floor(Math.random() * OBSERVE_DIRS.length)]);
    } else {
      const anim = IDLE_ANIMS[Math.floor(Math.random() * IDLE_ANIMS.length)];
      require('./state-machine').playTempAnim(anim, 3000);
    }
    schedule();
  }, delay);
}

module.exports = { start, stop };
