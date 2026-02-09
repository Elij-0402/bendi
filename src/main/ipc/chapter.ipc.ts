import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import type { CreateChapterInput, UpdateChapterInput } from '../../shared/types'
import { ChapterRepository } from '../services/database/repositories/chapter.repository'

const chapterRepo = new ChapterRepository()

export function registerChapterIPC(): void {
  ipcMain.handle(IPC_CHANNELS.CHAPTER_LIST, async (_event, projectId: number) => {
    try {
      return chapterRepo.findByProjectId(projectId)
    } catch (error) {
      throw new Error(`Failed to list chapters: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHAPTER_GET, async (_event, id: number) => {
    try {
      const chapter = chapterRepo.findById(id)
      if (!chapter) {
        throw new Error(`Chapter with id ${id} not found`)
      }
      return chapter
    } catch (error) {
      throw new Error(`Failed to get chapter: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHAPTER_CREATE, async (_event, input: CreateChapterInput) => {
    try {
      return chapterRepo.create(input)
    } catch (error) {
      throw new Error(`Failed to create chapter: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHAPTER_UPDATE, async (_event, input: UpdateChapterInput) => {
    try {
      return chapterRepo.update(input)
    } catch (error) {
      throw new Error(`Failed to update chapter: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHAPTER_DELETE, async (_event, id: number) => {
    try {
      chapterRepo.delete(id)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete chapter: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.CHAPTER_REORDER,
    async (_event, projectId: number, chapterIds: number[]) => {
      try {
        chapterRepo.reorder(projectId, chapterIds)
        return { success: true }
      } catch (error) {
        throw new Error(`Failed to reorder chapters: ${(error as Error).message}`)
      }
    }
  )
}
