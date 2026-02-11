import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, saveDatabaseSync } from './services/database/connection'
import { registerProjectIPC } from './ipc/project.ipc'
import { registerChapterIPC } from './ipc/chapter.ipc'
import { registerCharacterIPC } from './ipc/character.ipc'
import { registerWorldSettingIPC } from './ipc/world-setting.ipc'
import { registerAIIPC } from './ipc/ai.ipc'
import { registerSettingsIPC } from './ipc/settings.ipc'
import { registerOutlineIPC } from './ipc/outline.ipc'
import { registerStoryNoteIPC } from './ipc/story-note.ipc'
import { registerWritingStyleIPC } from './ipc/writing-style.ipc'
import { registerGenerationHistoryIPC } from './ipc/generation-history.ipc'
import { registerExportIPC } from './ipc/export.ipc'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: '笔境',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.benji.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database (async because sql.js needs to load WASM)
  await initDatabase()

  // Register IPC handlers
  registerProjectIPC()
  registerChapterIPC()
  registerCharacterIPC()
  registerWorldSettingIPC()
  registerAIIPC()
  registerSettingsIPC()
  registerOutlineIPC()
  registerStoryNoteIPC()
  registerWritingStyleIPC()
  registerGenerationHistoryIPC()
  registerExportIPC()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  saveDatabaseSync()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  saveDatabaseSync()
})

export { mainWindow }
