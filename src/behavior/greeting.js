const MESSAGES = [
  '主人，记得喝水哦!',
  '坐久了，起来活动一下吧~',
  '今天辛苦啦!',
  '要注意保护眼睛哦!',
  '休息一下，眺望远方吧~',
  '加油，你可以的!',
  '饿了记得投喂我~',
  '代码写累了休息会?',
];

let timer = null;
let petWindow = null;
let getPetState = null;

function init(pw, getStateFn) {
  petWindow = pw;
  getPetState = getStateFn;
}

function start() {
  stop();
  schedule();
}

function stop() {
  clearTimeout(timer);
  timer = null;
}

function schedule() {
  const delay = (5 + Math.random() * 5) * 60 * 1000;
  timer = setTimeout(() => {
    const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('pet:random-event', { text: msg });
    }
    require('./state-machine').playTempAnim('meow_sit', 3000);
    schedule();
  }, delay);
}

module.exports = { init, start, stop };
