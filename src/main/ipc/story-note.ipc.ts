import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import type { CreateStoryNoteInput, UpdateStoryNoteInput } from '../../shared/types'
import { StoryNoteRepository } from '../services/database/repositories/story-note.repository'

const storyNoteRepo = new StoryNoteRepository()

export function registerStoryNoteIPC(): void {
  ipcMain.handle(
    IPC_CHANNELS.STORY_NOTE_LIST,
    async (_event, projectId: number, category?: string) => {
      try {
        return storyNoteRepo.listByProject(projectId, category)
      } catch (error) {
        throw new Error(`Failed to list story notes: ${(error as Error).message}`)
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.STORY_NOTE_GET, async (_event, id: number) => {
    try {
      const note = storyNoteRepo.getById(id)
      if (!note) {
        throw new Error(`StoryNote with id ${id} not found`)
      }
      return note
    } catch (error) {
      throw new Error(`Failed to get story note: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.STORY_NOTE_CREATE, async (_event, input: CreateStoryNoteInput) => {
    try {
      return storyNoteRepo.create(input)
    } catch (error) {
      throw new Error(`Failed to create story note: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.STORY_NOTE_UPDATE,
    async (_event, id: number, input: UpdateStoryNoteInput) => {
      try {
        return storyNoteRepo.update(id, input)
      } catch (error) {
        throw new Error(`Failed to update story note: ${(error as Error).message}`)
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.STORY_NOTE_DELETE, async (_event, id: number) => {
    try {
      storyNoteRepo.remove(id)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete story note: ${(error as Error).message}`)
    }
  })
}
