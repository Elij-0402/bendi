import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import type { CreateProjectInput, UpdateProjectInput } from '../../shared/types'
import { ProjectRepository } from '../services/database/repositories/project.repository'

const projectRepo = new ProjectRepository()

export function registerProjectIPC(): void {
  ipcMain.handle(IPC_CHANNELS.PROJECT_LIST, async () => {
    try {
      return projectRepo.findAll()
    } catch (error) {
      throw new Error(`Failed to list projects: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET, async (_event, id: number) => {
    try {
      const project = projectRepo.findById(id)
      if (!project) {
        throw new Error(`Project with id ${id} not found`)
      }
      return project
    } catch (error) {
      throw new Error(`Failed to get project: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, async (_event, input: CreateProjectInput) => {
    try {
      return projectRepo.create(input)
    } catch (error) {
      throw new Error(`Failed to create project: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_UPDATE, async (_event, input: UpdateProjectInput) => {
    try {
      return projectRepo.update(input)
    } catch (error) {
      throw new Error(`Failed to update project: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.PROJECT_DELETE, async (_event, id: number) => {
    try {
      projectRepo.delete(id)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete project: ${(error as Error).message}`)
    }
  })
}
