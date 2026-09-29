const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onPetStatus: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on('pet:status', h);
    return () => ipcRenderer.removeListener('pet:status', h);
  },
  onSettings: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on('pet:settings', h);
    return () => ipcRenderer.removeListener('pet:settings', h);
  },
  onNurtureData: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on('pet:nurture-data', h);
    return () => ipcRenderer.removeListener('pet:nurture-data', h);
  },
  onRandomEvent: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on('pet:random-event', h);
    return () => ipcRenderer.removeListener('pet:random-event', h);
  },
  onBalance: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on('pet:balance', h);
    return () => ipcRenderer.removeListener('pet:balance', h);
  },
  onStateSound: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on('pet:state-sound', h);
    return () => ipcRenderer.removeListener('pet:state-sound', h);
  },
  refreshBalance: () => ipcRenderer.send('balance:refresh'),
  onDecorations: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on('pet:decorations', h);
    return () => ipcRenderer.removeListener('pet:decorations', h);
  },
  onEditMode: (cb) => {
    const h = (_, d) => cb(d);
    ipcRenderer.on('pet:edit-mode', h);
    return () => ipcRenderer.removeListener('pet:edit-mode', h);
  },
  hideWindow: () => ipcRenderer.send('pet:hide'),
  forceRepaint: () => ipcRenderer.send('pet:force-repaint'),
  resizeToContent: (w, h) => ipcRenderer.send('pet:resize-content', w, h),
  getSkinData: (skinId) => ipcRenderer.sendSync('pet:skin-data', skinId),
  showContextMenu: () => ipcRenderer.send('pet:context-menu'),
  sendFeed: (foodId) => ipcRenderer.send('pet:feed', foodId),
  sendClick: () => ipcRenderer.send('pet:click'),
  moveWindow: (dx, dy) => ipcRenderer.send('pet:move', dx, dy),
  dragMoveTo: (screenX, screenY) => ipcRenderer.send('pet:drag-move-to', screenX, screenY),
  dragStart: () => ipcRenderer.send('pet:drag-start'),
  dragEnd: () => ipcRenderer.send('pet:drag-end'),
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('pet:set-ignore-mouse', ignore),
  requestStats: () => ipcRenderer.invoke('pet:stats-request'),
  getSkinList: () => ipcRenderer.invoke('skin-picker:list'),
  selectSkin: (skinId) => ipcRenderer.send('skin-picker:select', skinId),
  decoPlace: (data) => ipcRenderer.send('deco:place', data),
  decoRemove: (id) => ipcRenderer.send('deco:remove', id),
  decoMove: (data) => ipcRenderer.send('deco:move', data),
  decoEditToggle: (active) => ipcRenderer.send('deco:edit-toggle', active),
  getConfigData: () => ipcRenderer.invoke('config:get-data'),
  configUpdate: (key, value) => ipcRenderer.send('config:update', key, value),
  configPlayAnim: (animName) => ipcRenderer.send('config:play-anim', animName),
  toggleFollowMouse: (enabled) => ipcRenderer.send('config:follow-mouse', enabled),
});
