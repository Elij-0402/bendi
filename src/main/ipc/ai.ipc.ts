import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import { aiService } from '../services/ai/ai-service'
import type { AIRequestPayload } from '../../shared/types'

export function registerAIIPC(): void {
  // AI_CHAT: Start streaming chat
  ipcMain.handle(IPC_CHANNELS.AI_CHAT, async (event, payload: AIRequestPayload) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    try {
      for await (const chunk of aiService.processRequest(payload)) {
        // Check if window is still valid before sending
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.AI_CHAT_STREAM, chunk)
        }
      }
    } catch (error) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.AI_CHAT_STREAM, {
          type: 'error',
          content: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  })

  // AI_CHAT_CANCEL: Cancel current stream
  ipcMain.handle(IPC_CHANNELS.AI_CHAT_CANCEL, async () => {
    aiService.cancel()
  })
}
