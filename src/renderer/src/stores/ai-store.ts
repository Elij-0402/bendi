import { create } from 'zustand'
import type { AIProvider, AIAction, AIStreamChunk } from '../../../shared/types'

interface ChatContext {
  chapterContent?: string
  characterInfo?: string
  worldInfo?: string
  projectId?: number
  chapterId?: number
  previousChapters?: string
}

interface AIState {
  providers: AIProvider[]
  currentProvider: AIProvider | null
  isStreaming: boolean
  streamContent: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  conversationId: number | null
  activeRequestId: string | null

  loadProviders: () => Promise<void>
  setCurrentProvider: (provider: AIProvider | null) => void

  loadConversation: (projectId: number, chapterId?: number) => Promise<void>
  sendMessage: (action: AIAction, text: string, context?: ChatContext) => Promise<void>
  appendStreamContent: (chunk: string) => void
  clearStream: () => void
  setStreaming: (streaming: boolean) => void
  cancelStream: () => void
  clearMessages: (projectId?: number, chapterId?: number) => Promise<void>
}

let unsubStream: (() => void) | null = null

function toChatMessages(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        m.role === 'user' || m.role === 'assistant'
    )
    .map((m) => ({ role: m.role, content: m.content }))
}

export const useAIStore = create<AIState>()((set, get) => ({
  providers: [],
  currentProvider: null,
  isStreaming: false,
  streamContent: '',
  messages: [],
  conversationId: null,
  activeRequestId: null,

  loadProviders: async () => {
    try {
      const providers = await window.api.aiProvider.list()
      set({ providers })
      const defaultProvider = providers.find((p) => p.isDefault) || providers[0] || null
      if (!get().currentProvider && defaultProvider) {
        set({ currentProvider: defaultProvider })
      }
    } catch (error) {
      console.error('Failed to load AI providers:', error)
    }
  },

  setCurrentProvider: (provider: AIProvider | null) => {
    set({ currentProvider: provider })
  },

  loadConversation: async (projectId: number, chapterId?: number) => {
    try {
      const { conversation, messages } = await window.api.ai.loadConversation(projectId, chapterId)
      set({
        conversationId: conversation?.id ?? null,
        messages: toChatMessages(messages),
        streamContent: '',
        isStreaming: false,
        activeRequestId: null
      })
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  },

  sendMessage: async (action: AIAction, text: string, context?: ChatContext) => {
    const { currentProvider, messages, conversationId } = get()
    if (!currentProvider) {
      console.error('No AI provider selected')
      return
    }

    const requestId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    set({
      messages: [...messages, { role: 'user', content: text }],
      isStreaming: true,
      streamContent: '',
      activeRequestId: requestId
    })

    if (unsubStream) {
      unsubStream()
      unsubStream = null
    }

    unsubStream = window.api.ai.onStream((chunk: AIStreamChunk) => {
      const state = get()
      if (chunk.source && chunk.source !== 'chat') return
      if (chunk.requestId && chunk.requestId !== state.activeRequestId) return

      if (chunk.type === 'text') {
        set({
          streamContent: state.streamContent + chunk.content,
          conversationId: chunk.conversationId ?? state.conversationId
        })
      } else if (chunk.type === 'done') {
        const finalContent = get().streamContent
        if (finalContent) {
          set((s) => ({
            messages: [...s.messages, { role: 'assistant', content: finalContent }],
            streamContent: '',
            isStreaming: false,
            activeRequestId: null,
            conversationId: chunk.conversationId ?? s.conversationId
          }))
        } else {
          set({ isStreaming: false, activeRequestId: null })
        }
        if (unsubStream) {
          unsubStream()
          unsubStream = null
        }
      } else if (chunk.type === 'error') {
        set((s) => ({
          messages: [...s.messages, { role: 'assistant', content: `[Error] ${chunk.content}` }],
          streamContent: '',
          isStreaming: false,
          activeRequestId: null,
          conversationId: chunk.conversationId ?? s.conversationId
        }))
        if (unsubStream) {
          unsubStream()
          unsubStream = null
        }
      }
    })

    try {
      await window.api.ai.chat({
        action,
        providerId: currentProvider.id,
        text,
        source: 'chat',
        requestId,
        conversationId: conversationId ?? undefined,
        conversationHistory: messages,
        context
      })
    } catch (error) {
      console.error('AI chat error:', error)
      set({ isStreaming: false, streamContent: '', activeRequestId: null })
    }
  },

  appendStreamContent: (chunk: string) => {
    set((state) => ({ streamContent: state.streamContent + chunk }))
  },

  clearStream: () => {
    set({ streamContent: '', isStreaming: false, activeRequestId: null })
  },

  setStreaming: (streaming: boolean) => {
    set({ isStreaming: streaming })
  },

  cancelStream: () => {
    window.api.ai.cancelStream('chat')
    const { streamContent } = get()
    if (streamContent) {
      set((s) => ({
        messages: [...s.messages, { role: 'assistant', content: `${streamContent} [cancelled]` }],
        streamContent: '',
        isStreaming: false,
        activeRequestId: null
      }))
    } else {
      set({ isStreaming: false, streamContent: '', activeRequestId: null })
    }
    if (unsubStream) {
      unsubStream()
      unsubStream = null
    }
  },

  clearMessages: async (projectId?: number, chapterId?: number) => {
    if (projectId) {
      await window.api.ai.clearConversation(projectId, chapterId)
    }
    set({ messages: [], streamContent: '', conversationId: null })
  }
}))
