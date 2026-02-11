import { create } from 'zustand'
import type {
  AIAction,
  AIStreamChunk,
  GenerationOptions,
  BrainstormType,
  SenseType,
  POVType
} from '../../../shared/types'

interface EditorAIState {
  currentAction: AIAction | null
  isStreaming: boolean
  result: string
  selectedText: string
  error: string | null
  activeRequestId: string | null

  brainstormType: BrainstormType
  senses: SenseType[]
  targetPOV: POVType
  generationOptions: GenerationOptions

  executeAction: (
    action: AIAction,
    params: {
      text: string
      selectedText?: string
      projectId: number
      chapterId?: number
      providerId: number
      chapterContent?: string
      brainstormType?: BrainstormType
      senses?: SenseType[]
      targetPOV?: POVType
      generationOptions?: GenerationOptions
    }
  ) => Promise<void>
  cancelAction: () => void
  clearResult: () => void
  setBrainstormType: (type: BrainstormType) => void
  setSenses: (senses: SenseType[]) => void
  setTargetPOV: (pov: POVType) => void
  setGenerationOptions: (options: Partial<GenerationOptions>) => void
}

let unsubEditorStream: (() => void) | null = null

export const useEditorAIStore = create<EditorAIState>()((set, get) => ({
  currentAction: null,
  isStreaming: false,
  result: '',
  selectedText: '',
  error: null,
  activeRequestId: null,

  brainstormType: 'plot' as BrainstormType,
  senses: ['sight', 'sound'] as SenseType[],
  targetPOV: 'third_person_limited' as POVType,
  generationOptions: {},

  executeAction: async (action, params) => {
    if (unsubEditorStream) {
      unsubEditorStream()
      unsubEditorStream = null
    }

    const requestId = `editor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    set({
      currentAction: action,
      isStreaming: true,
      result: '',
      selectedText: params.selectedText ?? '',
      error: null,
      activeRequestId: requestId
    })

    unsubEditorStream = window.api.ai.onStream((chunk: AIStreamChunk) => {
      if (chunk.source && chunk.source !== 'chat') return
      if (chunk.requestId && chunk.requestId !== get().activeRequestId) return

      if (chunk.type === 'text') {
        set((s) => ({ result: s.result + chunk.content }))
      } else if (chunk.type === 'done') {
        set({ isStreaming: false, activeRequestId: null })
        if (unsubEditorStream) {
          unsubEditorStream()
          unsubEditorStream = null
        }
      } else if (chunk.type === 'error') {
        set({
          isStreaming: false,
          error: chunk.content,
          activeRequestId: null
        })
        if (unsubEditorStream) {
          unsubEditorStream()
          unsubEditorStream = null
        }
      }
    })

    try {
      await window.api.ai.chat({
        action,
        providerId: params.providerId,
        text: params.text,
        selectedText: params.selectedText,
        requestId,
        context: {
          chapterContent: params.chapterContent,
          projectId: params.projectId,
          chapterId: params.chapterId
        },
        brainstormType: params.brainstormType ?? get().brainstormType,
        senses: params.senses ?? get().senses,
        targetPOV: params.targetPOV ?? get().targetPOV,
        generationOptions: params.generationOptions ?? get().generationOptions
      })
    } catch (error) {
      console.error('Editor AI action error:', error)
      set({ isStreaming: false, error: String(error), activeRequestId: null })
    }
  },

  cancelAction: () => {
    window.api.ai.cancelStream()
    set({
      isStreaming: false,
      currentAction: null,
      activeRequestId: null
    })
    if (unsubEditorStream) {
      unsubEditorStream()
      unsubEditorStream = null
    }
  },

  clearResult: () => {
    set({
      currentAction: null,
      result: '',
      selectedText: '',
      error: null,
      activeRequestId: null
    })
  },

  setBrainstormType: (type) => set({ brainstormType: type }),

  setSenses: (senses) => set({ senses }),

  setTargetPOV: (pov) => set({ targetPOV: pov }),

  setGenerationOptions: (options) => {
    set((s) => ({
      generationOptions: { ...s.generationOptions, ...options }
    }))
  }
}))
