import { create } from 'zustand'
import type { AIStreamChunk, GenerationOptions } from '../../../shared/types'
import { useAIStore } from './ai-store'

type InlineStatus = 'idle' | 'streaming' | 'completed' | 'error'

interface Alternative {
  text: string
  generationOptions?: GenerationOptions
}

interface InlineAIState {
  isStreaming: boolean
  currentText: string
  anchorPos: number
  status: InlineStatus
  alternatives: Alternative[]
  currentAlternativeIndex: number
  generationOptions: GenerationOptions
  error: string | null
  activeRequestId: string | null

  startContinuation: (params: {
    textBeforeCursor: string
    cursorPos: number
    chapterContent?: string
    projectId?: number
    chapterId?: number
  }) => Promise<void>
  cancelContinuation: () => void
  acceptSuggestion: () => void
  rejectSuggestion: () => void
  regenerate: (params: {
    textBeforeCursor: string
    cursorPos: number
    chapterContent?: string
    projectId?: number
    chapterId?: number
  }) => Promise<void>
  nextAlternative: () => void
  prevAlternative: () => void
  setGenerationOptions: (options: Partial<GenerationOptions>) => void
  reset: () => void
}

let unsubInlineStream: (() => void) | null = null

export const useInlineAIStore = create<InlineAIState>()((set, get) => ({
  isStreaming: false,
  currentText: '',
  anchorPos: 0,
  status: 'idle' as InlineStatus,
  alternatives: [],
  currentAlternativeIndex: -1,
  generationOptions: {},
  error: null,
  activeRequestId: null,

  startContinuation: async ({ textBeforeCursor, cursorPos, chapterContent, projectId, chapterId }) => {
    const aiStore = useAIStore.getState()
    const provider = aiStore.currentProvider
    if (!provider) return

    // Clean up previous stream listener
    if (unsubInlineStream) {
      unsubInlineStream()
      unsubInlineStream = null
    }

    const requestId = `inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    set({
      isStreaming: true,
      currentText: '',
      anchorPos: cursorPos,
      status: 'streaming',
      error: null,
      activeRequestId: requestId
    })

    // Set up stream listener — only handle inline source
    unsubInlineStream = window.api.ai.onStream((chunk: AIStreamChunk) => {
      if (chunk.source !== 'inline') return
      if (chunk.requestId && chunk.requestId !== get().activeRequestId) return

      const state = get()
      if (chunk.type === 'text') {
        set({ currentText: state.currentText + chunk.content })
      } else if (chunk.type === 'done') {
        set({ isStreaming: false, status: 'completed', activeRequestId: null })
        if (unsubInlineStream) {
          unsubInlineStream()
          unsubInlineStream = null
        }
      } else if (chunk.type === 'error') {
        set({ isStreaming: false, status: 'error', error: chunk.content, activeRequestId: null })
        if (unsubInlineStream) {
          unsubInlineStream()
          unsubInlineStream = null
        }
      }
    })

    try {
      await window.api.ai.chat({
        action: 'continue',
        providerId: provider.id,
        text: textBeforeCursor,
        source: 'inline',
        requestId,
        context: {
          chapterContent,
          projectId,
          chapterId
        },
        generationOptions: get().generationOptions
      })
    } catch (error) {
      console.error('Inline AI error:', error)
      set({ isStreaming: false, status: 'error', error: String(error), activeRequestId: null })
    }
  },

  cancelContinuation: () => {
    window.api.ai.cancelStream('inline')
    const { currentText } = get()
    set({
      isStreaming: false,
      status: currentText ? 'completed' : 'idle',
      currentText: currentText || '',
      activeRequestId: null
    })
    if (unsubInlineStream) {
      unsubInlineStream()
      unsubInlineStream = null
    }
  },

  acceptSuggestion: () => {
    set({
      isStreaming: false,
      currentText: '',
      anchorPos: 0,
      status: 'idle',
      alternatives: [],
      currentAlternativeIndex: -1,
      activeRequestId: null
    })
  },

  rejectSuggestion: () => {
    set({
      isStreaming: false,
      currentText: '',
      anchorPos: 0,
      status: 'idle',
      activeRequestId: null
    })
  },

  regenerate: async (params) => {
    const { currentText, alternatives, generationOptions } = get()

    // Save current result to alternatives if it has content
    const newAlternatives = [...alternatives]
    if (currentText) {
      newAlternatives.push({ text: currentText, generationOptions: { ...generationOptions } })
    }

    set({
      alternatives: newAlternatives,
      currentAlternativeIndex: -1,
      currentText: '',
      status: 'idle'
    })

    await get().startContinuation(params)
  },

  nextAlternative: () => {
    const { alternatives, currentAlternativeIndex, currentText, generationOptions } = get()
    if (alternatives.length === 0) return

    let newIndex: number
    let newAlternatives = [...alternatives]

    if (currentAlternativeIndex === -1) {
      // Currently showing live result, save it and switch to first alternative
      if (currentText) {
        newAlternatives.push({ text: currentText, generationOptions: { ...generationOptions } })
      }
      newIndex = 0
    } else {
      newIndex = (currentAlternativeIndex + 1) % newAlternatives.length
    }

    set({
      alternatives: newAlternatives,
      currentAlternativeIndex: newIndex,
      currentText: newAlternatives[newIndex].text
    })
  },

  prevAlternative: () => {
    const { alternatives, currentAlternativeIndex } = get()
    if (alternatives.length === 0) return

    const newIndex = currentAlternativeIndex <= 0
      ? alternatives.length - 1
      : currentAlternativeIndex - 1

    set({
      currentAlternativeIndex: newIndex,
      currentText: alternatives[newIndex].text
    })
  },

  setGenerationOptions: (options) => {
    set((state) => ({
      generationOptions: { ...state.generationOptions, ...options }
    }))
  },

  reset: () => {
    if (unsubInlineStream) {
      unsubInlineStream()
      unsubInlineStream = null
    }
    set({
      isStreaming: false,
      currentText: '',
      anchorPos: 0,
      status: 'idle',
      alternatives: [],
      currentAlternativeIndex: -1,
      error: null,
      activeRequestId: null
    })
  }
}))
