const { app, BrowserWindow, ipcMain, globalShortcut, autoUpdater } = require('electron')
const path = require('path')
const fs = require('fs')

const CONFIG_PATH = path.join(app.getPath('userData'), 'window-config.json')
const NOTES_PATH = path.join(app.getPath('userData'), 'notes.json')

// 读取窗口配置
function readWindowConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.error('读取窗口配置失败:', err)
  }
  return {
    x: undefined,
    y: undefined,
    width: 300,
    height: 400,
    hotkey: 'CommandOrControl+\\',
    opacity: 0.8,
    fontSize: 14,
    autoLaunch: false
  }
}

// 保存窗口配置
function saveWindowConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
  } catch (err) {
    console.error('保存窗口配置失败:', err)
  }
}

// 读取便签数据
function readNotes() {
  try {
    if (fs.existsSync(NOTES_PATH)) {
      const data = fs.readFileSync(NOTES_PATH, 'utf-8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.error('读取便签数据失败:', err)
  }
  return [{
    id: 'default',
    content: '',
    hotkey: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }]
}

// 保存便签数据
function saveNotes(notes) {
  try {
    fs.writeFileSync(NOTES_PATH, JSON.stringify(notes, null, 2))
  } catch (err) {
    console.error('保存便签数据失败:', err)
    return false
  }
  return true
}

let win = null

function createWindow() {
  const config = readWindowConfig()

  win = new BrowserWindow({
    ...config,
    minWidth: 200,
    minHeight: 150,
    title: '桌面便签',
    frame: false,
    transparent: false,
    resizable: true,
    alwaysOnTop: false,
    movable: true,
    opacity: config.opacity || 1,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'))
  }

  // 窗口加载完成后注册快捷键
  win.webContents.on('did-finish-load', () => {
    const config = readWindowConfig()
    registerGlobalHotkey(config.hotkey)
  })

  win.on('move', () => {
    try {
      if (win && !win.isDestroyed() && !win.isMinimized() && !win.isMaximized()) {
        const [x, y] = win.getPosition()
        const [width, height] = win.getSize()
        const opacity = win.getOpacity()
        saveWindowConfig({ x, y, width, height, opacity })
      }
    } catch (e) {
      // 忽略窗口已销毁的错误
    }
  })

  win.on('resize', () => {
    try {
      if (win && !win.isDestroyed() && !win.isMinimized() && !win.isMaximized()) {
        const [x, y] = win.getPosition()
        const [width, height] = win.getSize()
        const opacity = win.getOpacity()
        saveWindowConfig({ x, y, width, height, opacity })
      }
    } catch (e) {
      // 忽略窗口已销毁的错误
    }
  })

  win.on('close', () => {
    try {
      if (!win.isDestroyed()) {
        const [x, y] = win.getPosition()
        const [width, height] = win.getSize()
        const opacity = win.getOpacity()
        saveWindowConfig({ x, y, width, height, opacity })
      }
    } catch (e) {
      // 忽略错误
    }
  })

  win.on('closed', () => {
    win = null
  })
}

// 注册全局快捷键
function registerGlobalHotkey(hotkey) {
  globalShortcut.unregisterAll()

  if (hotkey && win) {
    const ret = globalShortcut.register(hotkey, () => {
      if (win && !win.isDestroyed()) {
        if (win.isVisible()) {
          win.hide()
        } else {
          if (win.isMinimized()) {
            win.restore()
          }
          win.focus()
          win.show()
        }
      }
    })
    if (!ret) {
      console.error('快捷键注册失败:', hotkey)
    } else {
      console.log('快捷键注册成功:', hotkey)
    }
  }
}

// 开机自启动
function setAutoLaunch(enable) {
  try {
    if (app.setLoginItemSettings) {
      app.setLoginItemSettings({
        openAtLogin: enable
      })
    }
  } catch (err) {
    console.error('设置开机自启动失败:', err)
  }
}

app.whenReady().then(() => {
  createWindow()
})

// 窗口控制
ipcMain.on('window-minimize', () => {
  if (win) win.minimize()
})

ipcMain.on('window-maximize', () => {
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
})

ipcMain.on('window-close', () => {
  if (win) win.close()
})

ipcMain.on('window-toggle-always-on-top', () => {
  if (win) {
    const isOnTop = win.isAlwaysOnTop()
    win.setAlwaysOnTop(!isOnTop)
    win.webContents.send('always-on-top-changed', !isOnTop)
  }
})

ipcMain.on('window-set-opacity', (_, opacity) => {
  if (win) {
    win.setOpacity(opacity)
    const config = readWindowConfig()
    saveWindowConfig({ ...config, opacity })
  }
})

// 便签数据操作
ipcMain.handle('get-notes', () => {
  return readNotes()
})

ipcMain.handle('save-note', (_, note) => {
  const notes = readNotes()
  const index = notes.findIndex(n => n.id === note.id)
  if (index >= 0) {
    notes[index] = { ...notes[index], ...note, updatedAt: new Date().toISOString() }
  } else {
    notes.push({ ...note, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  }
  saveNotes(notes)

  if (note.hotkey && note.isGlobalHotkey) {
    registerGlobalHotkey(note.hotkey)
  }

  return true
})

ipcMain.handle('delete-note', (_, noteId) => {
  let notes = readNotes()
  const deletedNote = notes.find(n => n.id === noteId)
  notes = notes.filter(n => n.id !== noteId)
  if (notes.length === 0) {
    notes.push({
      id: 'default',
      content: '',
      hotkey: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
  saveNotes(notes)

  if (deletedNote?.hotkey && deletedNote?.isGlobalHotkey) {
    const remainingNote = notes.find(n => n.hotkey && n.isGlobalHotkey)
    if (remainingNote) {
      registerGlobalHotkey(remainingNote.hotkey)
    } else {
      const config = readWindowConfig()
      registerGlobalHotkey(config.hotkey)
    }
  }

  return true
})

// 设置全局快捷键
ipcMain.handle('set-global-hotkey', (_, hotkey) => {
  registerGlobalHotkey(hotkey)
  const config = readWindowConfig()
  saveWindowConfig({ ...config, hotkey })
  return true
})

// 获取当前全局快捷键
ipcMain.handle('get-global-hotkey', () => {
  const config = readWindowConfig()
  return config.hotkey || 'CommandOrControl+\\'
})

// 获取配置
ipcMain.handle('get-config', () => {
  return readWindowConfig()
})

// 设置字体大小
ipcMain.handle('set-font-size', (_, fontSize) => {
  const config = readWindowConfig()
  saveWindowConfig({ ...config, fontSize: Math.max(12, Math.min(24, fontSize)) })
  return true
})

// 设置透明度
ipcMain.handle('set-opacity', (_, opacity) => {
  if (win) {
    win.setOpacity(Math.max(0.3, Math.min(1, opacity)))
    const config = readWindowConfig()
    saveWindowConfig({ ...config, opacity: Math.max(0.3, Math.min(1, opacity)) })
  }
  return true
})

// 设置开机自启动
ipcMain.handle('set-auto-launch', (_, enable) => {
  setAutoLaunch(enable)
  const config = readWindowConfig()
  saveWindowConfig({ ...config, autoLaunch: enable })
  return true
})

// 获取开机自启动状态
ipcMain.handle('get-auto-launch', () => {
  try {
    if (app.getLoginItemSettings) {
      return app.getLoginItemSettings().openAtLogin
    }
  } catch (err) {
    console.error('获取开机自启动状态失败:', err)
  }
  return false
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
