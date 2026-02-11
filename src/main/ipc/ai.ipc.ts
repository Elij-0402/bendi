import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import { aiService } from '../services/ai/ai-service'
import type { AIRequestPayload } from '../../shared/types'
import { AIConversationRepository } from '../services/database/repositories/ai-conversation.repository'

const aiConversationRepo = new AIConversationRepository()

export function registerAIIPC(): void {
  // AI_CHAT: Start streaming chat
  ipcMain.handle(IPC_CHANNELS.AI_CHAT, async (event, payload: AIRequestPayload) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    const source = payload.source ?? 'chat'
    const requestId = payload.requestId
    let conversationId = payload.conversationId

    if (source === 'chat' && payload.context?.projectId) {
      const conversation = aiConversationRepo.getOrCreate(
        payload.context.projectId,
        payload.context.chapterId
      )
      conversationId = conversation.id
      payload.conversationId = conversation.id

      if (!payload.conversationHistory || payload.conversationHistory.length === 0) {
        const history = aiConversationRepo.listMessages(conversation.id)
        payload.conversationHistory = history
          .filter(
            (m): m is typeof m & { role: 'user' | 'assistant' } =>
              m.role === 'user' || m.role === 'assistant'
          )
          .map((m) => ({ role: m.role, content: m.content }))
      }

      aiConversationRepo.addMessage(conversation.id, 'user', payload.text)
    }

    let assistantText = ''

    try {
      for await (const chunk of aiService.processRequest(payload)) {
        if (chunk.type === 'text') {
          assistantText += chunk.content
        }
        // Check if window is still valid before sending
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.AI_CHAT_STREAM, {
            ...chunk,
            source,
            requestId,
            conversationId
          })
        }
      }

      if (source === 'chat' && conversationId && assistantText.trim()) {
        aiConversationRepo.addMessage(conversationId, 'assistant', assistantText)
      }
    } catch (error) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.AI_CHAT_STREAM, {
          type: 'error',
          content: error instanceof Error ? error.message : 'Unknown error',
          source,
          requestId,
          conversationId
        })
      }
    }
  })

  // AI_CHAT_CANCEL: Cancel current stream
  ipcMain.handle(IPC_CHANNELS.AI_CHAT_CANCEL, async (_event, source?: 'chat' | 'inline') => {
    aiService.cancel(source)
  })

  ipcMain.handle(
    IPC_CHANNELS.AI_CONVERSATION_LOAD,
    async (_event, projectId: number, chapterId?: number) => {
      const conversation = aiConversationRepo.findLatest(projectId, chapterId)
      if (!conversation) {
        return { conversation: null, messages: [] }
      }
      const messages = aiConversationRepo
        .listMessages(conversation.id)
        .filter((m) => m.role === 'user' || m.role === 'assistant')
      return { conversation, messages }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_CONVERSATION_CLEAR,
    async (_event, projectId: number, chapterId?: number) => {
      aiConversationRepo.clearByProject(projectId, chapterId)
      return { success: true }
    }
  )
}
