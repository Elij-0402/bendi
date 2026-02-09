import { create } from 'zustand'
import type { AIProvider, AIAction, AIStreamChunk } from '../../../shared/types'

interface AIState {
  providers: AIProvider[]
  currentProvider: AIProvider | null
  isStreaming: boolean
  streamContent: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>

  loadProviders: () => Promise<void>
  setCurrentProvider: (provider: AIProvider | null) => void

  sendMessage: (action: AIAction, text: string, context?: object) => Promise<void>
  appendStreamContent: (chunk: string) => void
  clearStream: () => void
  setStreaming: (streaming: boolean) => void
  cancelStream: () => void
  clearMessages: () => void
}

let unsubStream: (() => void) | null = null

export const useAIStore = create<AIState>()((set, get) => ({
  providers: [],
  currentProvider: null,
  isStreaming: false,
  streamContent: '',
  messages: [],

  loadProviders: async () => {
    try {
      const providers = await window.api.aiProvider.list()
      set({ providers })
      // Auto-select default provider
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

  sendMessage: async (action: AIAction, text: string, context?: object) => {
    const { currentProvider, messages } = get()
    if (!currentProvider) {
      console.error('No AI provider selected')
      return
    }

    // Add user message to history
    set({
      messages: [...messages, { role: 'user', content: text }],
      isStreaming: true,
      streamContent: ''
    })

    // Clean up previous stream listener
    if (unsubStream) {
      unsubStream()
      unsubStream = null
    }

    // Set up stream listener
    unsubStream = window.api.ai.onStream((chunk: AIStreamChunk) => {
      const state = get()
      if (chunk.type === 'text') {
        set({ streamContent: state.streamContent + chunk.content })
      } else if (chunk.type === 'done') {
        // Finalize: move stream content into messages
        const finalContent = get().streamContent
        if (finalContent) {
          set((s) => ({
            messages: [...s.messages, { role: 'assistant', content: finalContent }],
            streamContent: '',
            isStreaming: false
          }))
        } else {
          set({ isStreaming: false })
        }
        if (unsubStream) {
          unsubStream()
          unsubStream = null
        }
      } else if (chunk.type === 'error') {
        set((s) => ({
          messages: [
            ...s.messages,
            { role: 'assistant', content: `[Error] ${chunk.content}` }
          ],
          streamContent: '',
          isStreaming: false
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
        context: context as { chapterContent?: string; characterInfo?: string; worldInfo?: string }
      })
    } catch (error) {
      console.error('AI chat error:', error)
      set({ isStreaming: false, streamContent: '' })
    }
  },

  appendStreamContent: (chunk: string) => {
    set((state) => ({ streamContent: state.streamContent + chunk }))
  },

  clearStream: () => {
    set({ streamContent: '', isStreaming: false })
  },

  setStreaming: (streaming: boolean) => {
    set({ isStreaming: streaming })
  },

  cancelStream: () => {
    window.api.ai.cancelStream()
    const { streamContent } = get()
    if (streamContent) {
      set((s) => ({
        messages: [...s.messages, { role: 'assistant', content: streamContent + ' [cancelled]' }],
        streamContent: '',
        isStreaming: false
      }))
    } else {
      set({ isStreaming: false, streamContent: '' })
    }
    if (unsubStream) {
      unsubStream()
      unsubStream = null
    }
  },

  clearMessages: () => {
    set({ messages: [], streamContent: '' })
  }
}))
