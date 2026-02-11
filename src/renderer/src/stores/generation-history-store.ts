import { create } from 'zustand'
import type { GenerationHistory, AIAction } from '../../../shared/types'

interface GenerationHistoryState {
  entries: GenerationHistory[]
  isLoading: boolean

  loadHistory: (
    projectId: number,
    options?: { action?: AIAction; chapterId?: number; limit?: number }
  ) => Promise<void>
  deleteEntry: (id: number) => Promise<void>
  clearHistory: (projectId: number) => Promise<void>
}

export const useGenerationHistoryStore = create<GenerationHistoryState>()((set, get) => ({
  entries: [],
  isLoading: false,

  loadHistory: async (projectId, options?) => {
    set({ isLoading: true })
    try {
      const entries = await window.api.generationHistory.list(projectId, options)
      set({ entries })
    } catch (error) {
      console.error('Failed to load generation history:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  deleteEntry: async (id) => {
    await window.api.generationHistory.delete(id)
    set((s) => ({
      entries: s.entries.filter((e) => e.id !== id)
    }))
  },

  clearHistory: async (projectId) => {
    await window.api.generationHistory.clear(projectId)
    set({ entries: [] })
  }
}))
