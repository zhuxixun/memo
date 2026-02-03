import React, { useState, useEffect, useCallback, useRef } from 'react'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function formatHotkey(hotkey) {
  if (!hotkey) return ''
  return hotkey
    .replace('CommandOrControl', 'Ctrl')
    .replace('Shift', 'Shift')
    .replace('Alt', 'Alt')
    .replace('Option', 'Alt')
    .replace('Super', 'Win')
}

function App() {
  const [notes, setNotes] = useState([])
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false)
  const [globalHotkey, setGlobalHotkey] = useState('Ctrl+`')
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false)
  const [opacity, setOpacity] = useState(0.8)
  const [showSettings, setShowSettings] = useState(false)
  const recordingKeyRef = useRef([])
  const textareaRef = useRef(null)

  useEffect(() => {
    loadNotes()
    loadConfig()
  }, [])

  const loadNotes = async () => {
    const data = await window.electronAPI?.getNotes()
    if (data && data.length > 0) {
      setNotes(data)
      // 只在没有选中的便签时设置第一个
      if (!activeNoteId || !data.find(n => n.id === activeNoteId)) {
        setActiveNoteId(data[0].id)
      }
    }
  }

  const loadConfig = async () => {
    const config = await window.electronAPI?.getConfig()
    if (config) {
      setOpacity(config.opacity || 0.8)
      setGlobalHotkey(formatHotkey(config.hotkey) || 'Ctrl+`')
    }
  }

  useEffect(() => {
    if (!activeNoteId || notes.length === 0) return

    const timer = setTimeout(async () => {
      const activeNote = notes.find(n => n.id === activeNoteId)
      if (activeNote) {
        await window.electronAPI?.saveNote(activeNote)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [notes, activeNoteId])

  useEffect(() => {
    const handleAlwaysOnTopChanged = (value) => {
      setIsAlwaysOnTop(value)
    }
    window.electronAPI?.onAlwaysOnTopChanged(handleAlwaysOnTopChanged)
  }, [])

  useEffect(() => {
    if (!isRecordingHotkey) return

    const handleKeyDown = (e) => {
      e.preventDefault()
      e.stopPropagation()

      const keys = []
      if (e.ctrlKey || e.metaKey) keys.push('CommandOrControl')
      if (e.shiftKey) keys.push('Shift')
      if (e.altKey || e.optionKey) keys.push('Alt')
      if (e.key && e.key.length === 1) {
        keys.push(e.key.toUpperCase())
      } else if (e.key && e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt' && e.key !== 'Meta') {
        keys.push(e.key)
      }

      if (keys.length > 0) {
        recordingKeyRef.current = keys
        setGlobalHotkey(keys.join('+').replace('CommandOrControl', 'Ctrl'))
      }
    }

    const handleKeyUp = (e) => {
      e.preventDefault()
      setIsRecordingHotkey(false)
      const hotkey = recordingKeyRef.current.join('+')
      saveGlobalHotkey(hotkey)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isRecordingHotkey])

  const saveGlobalHotkey = async (hotkey) => {
    await window.electronAPI?.setGlobalHotkey(hotkey)
    setGlobalHotkey(formatHotkey(hotkey))
  }

  const handleOpacityChange = async (e) => {
    const newOpacity = parseFloat(e.target.value)
    setOpacity(newOpacity)
    await window.electronAPI?.setOpacity(newOpacity)
  }

  const handleContentChange = useCallback((e) => {
    const content = e.target.value
    setNotes(prev => prev.map(note =>
      note.id === activeNoteId
        ? { ...note, content }
        : note
    ))
  }, [activeNoteId])

  const handleCreateNote = async () => {
    const newNote = {
      id: generateId(),
      content: ''
    }
    await window.electronAPI?.saveNote(newNote)
    await loadNotes()
    setActiveNoteId(newNote.id)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleDeleteNote = async (noteId, e) => {
    if (e) e.stopPropagation()
    await window.electronAPI?.deleteNote(noteId)
    await loadNotes()
  }

  const handleMinimize = () => {
    window.electronAPI?.windowMinimize()
  }

  const handleMaximize = () => {
    window.electronAPI?.windowMaximize()
  }

  const handleAppClose = () => {
    window.electronAPI?.windowClose()
  }

  const handleToggleAlwaysOnTop = () => {
    window.electronAPI?.windowToggleAlwaysOnTop()
  }

  const activeNote = notes.find(n => n.id === activeNoteId)

  return (
    <div
      className="h-screen flex flex-col text-white drag-region overflow-hidden"
      style={{ backgroundColor: `rgba(0, 0, 0, ${opacity})` }}
    >
      {/* 标题栏 - 极简设计 */}
      <div className="h-6 flex items-center justify-between px-2 flex-shrink-0">
        <span className="text-xs text-gray-400 select-none">{globalHotkey}</span>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleMinimize}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white text-sm leading-none"
            title="最小化"
          >
            −
          </button>
          <button
            onClick={handleMaximize}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white text-sm leading-none"
            title="最大化"
          >
            □
          </button>
          <button
            onClick={handleAppClose}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/50 text-gray-400 hover:text-white text-sm leading-none"
            title="关闭"
          >
            ×
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div
          className="bg-black/50 border-b border-white/10 p-3 flex-shrink-0"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <h3 className="text-xs font-medium mb-3 text-gray-300">设置</h3>

          <div className="mb-3">
            <label className="text-xs text-gray-400 block mb-1">
              透明度: {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={opacity}
              onChange={handleOpacityChange}
              className="w-full h-1 bg-gray-600 rounded appearance-none cursor-pointer"
            />
          </div>

          <div className="mb-3">
            <label className="text-xs text-gray-400 block mb-1">快捷键</label>
            <button
              onClick={() => setIsRecordingHotkey(true)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                isRecordingHotkey
                  ? 'bg-yellow-600 animate-pulse'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {isRecordingHotkey ? '按下快捷键...' : globalHotkey}
            </button>
          </div>
        </div>
      )}

      {/* 便签列表 - 简洁设计 */}
      {notes.length > 0 && (
        <div
          className="flex items-center gap-1 px-2 py-1 border-b border-white/5 overflow-x-auto"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          {notes.map(note => (
            <div
              key={note.id}
              onClick={(e) => {
                e.stopPropagation()
                setActiveNoteId(note.id)
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer text-xs whitespace-nowrap transition-colors ${
                note.id === activeNoteId
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="truncate max-w-16">
                {note.content ? note.content.substring(0, 8).replace(/\n/g, ' ') || '...' : '...'}
              </span>
              {note.hotkey && (
                <span className="text-blue-400 opacity-60">{formatHotkey(note.hotkey)}</span>
              )}
            </div>
          ))}
          <button
            onClick={handleCreateNote}
            className="px-2 py-0.5 rounded text-gray-500 hover:text-white hover:bg-white/5 text-xs"
            title="新建便签"
          >
            +
          </button>
        </div>
      )}

      {/* 便签内容编辑区域 */}
      <div
        className="flex-1 p-3 flex flex-col"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <textarea
          key={activeNoteId}
          ref={textareaRef}
          value={activeNote?.content || ''}
          onChange={handleContentChange}
          placeholder="输入便签内容..."
          className="w-full h-full bg-transparent text-sm resize-none focus:outline-none placeholder-gray-500/50 overflow-y-auto scrollbar-hide"
          spellCheck={false}
          autoFocus
        />
      </div>

      {/* 底部状态栏 - 极简 */}
      <div className="h-5 flex items-center justify-between px-2 border-t border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              showSettings
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {showSettings ? '✕' : '⚙'}
          </button>
          <button
            onClick={handleToggleAlwaysOnTop}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              isAlwaysOnTop
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title="置顶"
          >
            📌
          </button>
        </div>

        <span className="text-xs text-gray-500">
          {notes.length > 1 && `${notes.length} 便签`}
        </span>

        <div className="flex items-center gap-2">
          {notes.length > 1 && (
            <button
              onClick={() => handleDeleteNote(activeNoteId)}
              className="text-xs px-2 py-0.5 rounded text-gray-500 hover:text-red-400 hover:bg-white/5"
              title="删除便签"
            >
              ×
            </button>
          )}
          {notes.length <= 1 && (
            <button
              onClick={handleCreateNote}
              className="text-xs px-2 py-0.5 rounded text-gray-500 hover:text-white hover:bg-white/5"
            >
              + 新建
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
