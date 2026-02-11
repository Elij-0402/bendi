import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import type { CreateCharacterInput, UpdateCharacterInput } from '../../shared/types'
import { CharacterRepository } from '../services/database/repositories/character.repository'

const characterRepo = new CharacterRepository()

export function registerCharacterIPC(): void {
  ipcMain.handle(IPC_CHANNELS.CHARACTER_LIST, async (_event, projectId: number) => {
    try {
      return characterRepo.findByProjectId(projectId)
    } catch (error) {
      throw new Error(`Failed to list characters: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHARACTER_GET, async (_event, id: number) => {
    try {
      const character = characterRepo.findById(id)
      if (!character) {
        throw new Error(`Character with id ${id} not found`)
      }
      return character
    } catch (error) {
      throw new Error(`Failed to get character: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHARACTER_CREATE, async (_event, input: CreateCharacterInput) => {
    try {
      return characterRepo.create(input)
    } catch (error) {
      throw new Error(`Failed to create character: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHARACTER_UPDATE, async (_event, input: UpdateCharacterInput) => {
    try {
      return characterRepo.update(input)
    } catch (error) {
      throw new Error(`Failed to update character: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHARACTER_DELETE, async (_event, id: number) => {
    try {
      characterRepo.delete(id)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete character: ${(error as Error).message}`)
    }
  })
}
