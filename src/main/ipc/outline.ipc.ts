import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import type { CreateOutlineInput, UpdateOutlineInput, AIRequestPayload } from '../../shared/types'
import { OutlineRepository } from '../services/database/repositories/outline.repository'
import { aiService } from '../services/ai/ai-service'

const outlineRepo = new OutlineRepository()

export function registerOutlineIPC(): void {
  ipcMain.handle(IPC_CHANNELS.OUTLINE_LIST, async (_event, projectId: number) => {
    try {
      return outlineRepo.listByProject(projectId)
    } catch (error) {
      throw new Error(`Failed to list outlines: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.OUTLINE_GET, async (_event, id: number) => {
    try {
      const outline = outlineRepo.getById(id)
      if (!outline) {
        throw new Error(`Outline with id ${id} not found`)
      }
      return outline
    } catch (error) {
      throw new Error(`Failed to get outline: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.OUTLINE_CREATE, async (_event, input: CreateOutlineInput) => {
    try {
      return outlineRepo.create(input)
    } catch (error) {
      throw new Error(`Failed to create outline: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.OUTLINE_UPDATE,
    async (_event, id: number, input: UpdateOutlineInput) => {
      try {
        return outlineRepo.update(id, input)
      } catch (error) {
        throw new Error(`Failed to update outline: ${(error as Error).message}`)
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.OUTLINE_DELETE, async (_event, id: number) => {
    try {
      outlineRepo.remove(id)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete outline: ${(error as Error).message}`)
    }
  })

  // OUTLINE_GENERATE: AI-powered outline generation (streaming)
  ipcMain.handle(IPC_CHANNELS.OUTLINE_GENERATE, async (event, payload: AIRequestPayload) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    const source = payload.source ?? 'inline'
    const requestId = payload.requestId

    try {
      for await (const chunk of aiService.processRequest({
        ...payload,
        action: 'outline'
      })) {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.AI_CHAT_STREAM, {
            ...chunk,
            source,
            requestId
          })
        }
      }
    } catch (error) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.AI_CHAT_STREAM, {
          type: 'error',
          content: error instanceof Error ? error.message : 'Unknown error',
          source,
          requestId
        })
      }
    }
  })
}
