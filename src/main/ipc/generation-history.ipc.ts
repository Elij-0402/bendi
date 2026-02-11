import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import { GenerationHistoryRepository } from '../services/database/repositories/generation-history.repository'

const generationHistoryRepo = new GenerationHistoryRepository()

export function registerGenerationHistoryIPC(): void {
  ipcMain.handle(
    IPC_CHANNELS.GENERATION_HISTORY_LIST,
    async (
      _event,
      projectId: number,
      options?: { action?: string; chapterId?: number; limit?: number }
    ) => {
      try {
        return generationHistoryRepo.listByProject(projectId, options)
      } catch (error) {
        throw new Error(`Failed to list generation history: ${(error as Error).message}`)
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.GENERATION_HISTORY_GET, async (_event, id: number) => {
    try {
      const record = generationHistoryRepo.getById(id)
      if (!record) {
        throw new Error(`GenerationHistory with id ${id} not found`)
      }
      return record
    } catch (error) {
      throw new Error(`Failed to get generation history: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.GENERATION_HISTORY_DELETE, async (_event, id: number) => {
    try {
      generationHistoryRepo.remove(id)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete generation history: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.GENERATION_HISTORY_CLEAR, async (_event, projectId: number) => {
    try {
      generationHistoryRepo.clearByProject(projectId)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to clear generation history: ${(error as Error).message}`)
    }
  })
}
