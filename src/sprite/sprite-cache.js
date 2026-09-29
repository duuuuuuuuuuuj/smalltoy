const cache = new Map();

module.exports = {
  has: (key) => cache.has(key),
  get: (key) => cache.get(key),
  set: (key, val) => cache.set(key, val),
  delete: (key) => cache.delete(key),
  clear: () => cache.clear(),
};
