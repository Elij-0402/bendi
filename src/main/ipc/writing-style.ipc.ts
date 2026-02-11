import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import type { CreateWritingStyleInput, UpdateWritingStyleInput } from '../../shared/types'
import { WritingStyleRepository } from '../services/database/repositories/writing-style.repository'
import { aiService } from '../services/ai/ai-service'

const writingStyleRepo = new WritingStyleRepository()

export function registerWritingStyleIPC(): void {
  ipcMain.handle(
    IPC_CHANNELS.STYLE_PROFILE_LIST,
    async (_event, projectId: number | null) => {
      try {
        return writingStyleRepo.listByProject(projectId)
      } catch (error) {
        throw new Error(`Failed to list writing styles: ${(error as Error).message}`)
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.STYLE_PROFILE_GET, async (_event, id: number) => {
    try {
      const style = writingStyleRepo.getById(id)
      if (!style) {
        throw new Error(`WritingStyleProfile with id ${id} not found`)
      }
      return style
    } catch (error) {
      throw new Error(`Failed to get writing style: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.STYLE_PROFILE_CREATE,
    async (_event, input: CreateWritingStyleInput) => {
      try {
        return writingStyleRepo.create(input)
      } catch (error) {
        throw new Error(`Failed to create writing style: ${(error as Error).message}`)
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.STYLE_PROFILE_UPDATE,
    async (_event, id: number, input: UpdateWritingStyleInput) => {
      try {
        return writingStyleRepo.update(id, input)
      } catch (error) {
        throw new Error(`Failed to update writing style: ${(error as Error).message}`)
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.STYLE_PROFILE_DELETE, async (_event, id: number) => {
    try {
      writingStyleRepo.remove(id)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete writing style: ${(error as Error).message}`)
    }
  })

  ipcMain.handle(IPC_CHANNELS.STYLE_PROFILE_ANALYZE, async (_event, id: number) => {
    try {
      const style = writingStyleRepo.getById(id)
      if (!style) {
        throw new Error(`WritingStyleProfile with id ${id} not found`)
      }

      // Collect the full analysis text from the streaming response
      let analysisText = ''
      for await (const chunk of aiService.processRequest({
        action: 'style_analysis',
        providerId: 0, // Will use default provider
        text: style.sampleText,
        styleProfileId: id
      })) {
        if (chunk.type === 'text') {
          analysisText += chunk.content
        }
      }

      // Try to parse the analysis as JSON and save it
      try {
        const analysis = JSON.parse(analysisText)
        return writingStyleRepo.update(id, { analysis })
      } catch {
        // If AI didn't return valid JSON, store as summary
        const analysis = {
          tone: '',
          pacing: '',
          vocabularyLevel: '',
          sentenceStructure: '',
          narrativeVoice: '',
          rhetoricalDevices: [],
          summary: analysisText
        }
        return writingStyleRepo.update(id, { analysis })
      }
    } catch (error) {
      throw new Error(`Failed to analyze writing style: ${(error as Error).message}`)
    }
  })
}
