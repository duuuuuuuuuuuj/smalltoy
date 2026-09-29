const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME,
  '.claude-tool-electron', 'pet-cache'
);
const USAGE_PATH = path.join(DATA_DIR, 'deepseek-usage.json');

let getApiKey = null;
let onChange = null;
let timer = null;

let currentBalance = null;
let lastBalance = null;
let todayUsed = 0;
let todayDate = null;
let lastError = null;

function localDateStr(d) {
  const t = d || new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const day = String(t.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function loadUsage() {
  try {
    if (fs.existsSync(USAGE_PATH)) {
      const d = JSON.parse(fs.readFileSync(USAGE_PATH, 'utf-8'));
      todayDate = d.date || null;
      lastBalance = typeof d.lastBalance === 'number' ? d.lastBalance : null;
      todayUsed = typeof d.todayUsed === 'number' ? d.todayUsed : 0;
    }
  } catch (e) {
    console.warn('[pet] Failed to load DeepSeek usage:', e.message);
  }
}

function saveUsage() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(USAGE_PATH, JSON.stringify({ date: todayDate, lastBalance, todayUsed }, null, 2), 'utf-8');
  } catch (e) {
    console.error('[pet] Failed to save DeepSeek usage:', e.message);
  }
}

function fetchBalance(apiKey) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/user/balance',
      method: 'GET',
      headers: { Authorization: 'Bearer ' + apiKey },
      timeout: 10000,
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          if (res.statusCode === 200 && j && j.balance_infos) {
            resolve(j);
          } else {
            const msg = (j && j.error && j.error.message) || ('HTTP ' + res.statusCode);
            reject(new Error(msg));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('请求超时')); });
    req.end();
  });
}

function computeTotal(j) {
  let total = 0;
  const infos = j && j.balance_infos ? j.balance_infos : [];
  for (const info of infos) {
    const v = parseFloat(info.total_balance);
    if (!isNaN(v)) total += v;
  }
  return total;
}

function emit(payload) {
  if (onChange) onChange(payload);
}

async function poll() {
  const apiKey = getApiKey ? getApiKey() : '';
  if (!apiKey) {
    emit({ hasKey: false, balance: null, todayUsed, currency: 'CNY', error: null });
    return;
  }
  try {
    const j = await fetchBalance(apiKey);
    const balance = computeTotal(j);
    currentBalance = balance;
    lastError = null;

    const today = localDateStr();
    if (todayDate !== today) {
      todayDate = today;
      todayUsed = 0;
      lastBalance = balance;
    } else if (lastBalance != null && balance < lastBalance) {
      // 余额下降按消费累计；余额上升（充值/赠金）不冲抵
      todayUsed += (lastBalance - balance);
    }
    lastBalance = balance;
    saveUsage();

    emit({ hasKey: true, balance, todayUsed, currency: 'CNY', error: null });
  } catch (e) {
    lastError = e.message;
    emit({ hasKey: true, balance: currentBalance, todayUsed, currency: 'CNY', error: e.message });
  }
}

function start(opts) {
  getApiKey = opts.getApiKey;
  onChange = opts.onChange;
  loadUsage();
  poll();
  timer = setInterval(poll, 60 * 1000);
}

function refreshNow() {
  poll();
}

function stop() {
  if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { start, refreshNow, stop };
