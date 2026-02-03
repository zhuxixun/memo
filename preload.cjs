const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowToggleAlwaysOnTop: () => ipcRenderer.send('window-toggle-always-on-top'),
  onAlwaysOnTopChanged: (callback) => ipcRenderer.on('always-on-top-changed', (_, value) => callback(value)),
  windowSetOpacity: (opacity) => ipcRenderer.send('window-set-opacity', opacity),
  // 便签数据操作
  getNotes: () => ipcRenderer.invoke('get-notes'),
  saveNote: (note) => ipcRenderer.invoke('save-note', note),
  deleteNote: (noteId) => ipcRenderer.invoke('delete-note', noteId),
  // 快捷键操作
  setGlobalHotkey: (hotkey) => ipcRenderer.invoke('set-global-hotkey', hotkey),
  getGlobalHotkey: () => ipcRenderer.invoke('get-global-hotkey'),
  // 配置操作
  getConfig: () => ipcRenderer.invoke('get-config'),
  setOpacity: (opacity) => ipcRenderer.invoke('set-opacity', opacity),
  setAutoLaunch: (enable) => ipcRenderer.invoke('set-auto-launch', enable),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch')
})
