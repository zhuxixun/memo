# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Windows desktop sticky note application built with React + Tailwind CSS + Electron.

## Commands

- `npm run dev` - Start Vite dev server (for React development)
- `npm run build` - Build React app for production
- `npm start` - Launch Electron app (runs after build)
- `npm run preview` - Preview production build

## Architecture

### Process Model
- **Main Process** (`main.cjs`): Electron window management, global shortcuts, file I/O
- **Preload Script** (`preload.cjs`): Exposes safe APIs via `contextBridge`
- **Renderer Process**: React UI communicating via `window.electronAPI`

### IPC Communication
Renderer calls main process through `window.electronAPI`:
- Window control: minimize, maximize, close, always-on-top toggle
- Notes CRUD: `getNotes`, `saveNote`, `deleteNote`
- Settings: `getConfig`, `setOpacity`, `setFontSize`, global hotkey management

### Data Storage
- `notes.json`: Array of note objects with id, content, hotkey, position, opacity
- `window-config.json`: Window dimensions, position, default hotkey, opacity, fontSize
- Location: `%LOCALAPPDATA%\DesktopNote` (Windows)

### Key Components
- `App.jsx`: Main UI with tabs, settings panel, textarea for note editing
- Hotkey format: `CommandOrControl+Key` (electron-globalShortcut format)

### UI Interactions
- `-webkit-app-region: drag` enables window dragging
- `-webkit-app-region: no-drag` needed on interactive elements (textarea, settings panel, tabs, scrollbars)

## Tech Stack

- React 18
- Tailwind CSS 3
- Vite 5
- Electron 28
