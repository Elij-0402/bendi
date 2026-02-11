import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import type { CreateWorldSettingInput, UpdateWorldSettingInput } from '../../shared/types'
import { WorldSettingRepository } from '../services/database/repositories/world-setting.repository'

const worldSettingRepo = new WorldSettingRepository()

export function registerWorldSettingIPC(): void {
  ipcMain.handle(IPC_CHANNELS.WORLD_SETTING_LIST, async (_event, projectId: number) => {
    try {
      return worldSettingRepo.findByProjectId(projectId)
    } catch (error) {
      throw new Error(`Failed to list world settings: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.WORLD_SETTING_GET, async (_event, id: number) => {
    try {
      const setting = worldSettingRepo.findById(id)
      if (!setting) {
        throw new Error(`WorldSetting with id ${id} not found`)
      }
      return setting
    } catch (error) {
      throw new Error(`Failed to get world setting: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.WORLD_SETTING_CREATE, async (_event, input: CreateWorldSettingInput) => {
    try {
      return worldSettingRepo.create(input)
    } catch (error) {
      throw new Error(`Failed to create world setting: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.WORLD_SETTING_UPDATE, async (_event, input: UpdateWorldSettingInput) => {
    try {
      return worldSettingRepo.update(input)
    } catch (error) {
      throw new Error(`Failed to update world setting: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.WORLD_SETTING_DELETE, async (_event, id: number) => {
    try {
      worldSettingRepo.delete(id)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete world setting: ${(error as Error).message}`)
    }
  })
}
