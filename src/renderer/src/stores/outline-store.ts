import { create } from 'zustand'
import type { Outline, CreateOutlineInput, UpdateOutlineInput } from '../../../shared/types'

interface OutlineState {
  outlines: Outline[]
  currentOutline: Outline | null
  isLoading: boolean
  isGenerating: boolean

  loadOutlines: (projectId: number) => Promise<void>
  createOutline: (input: CreateOutlineInput) => Promise<Outline>
  updateOutline: (id: number, input: UpdateOutlineInput) => Promise<void>
  deleteOutline: (id: number) => Promise<void>
  setCurrentOutline: (outline: Outline | null) => void
}

export const useOutlineStore = create<OutlineState>()((set, get) => ({
  outlines: [],
  currentOutline: null,
  isLoading: false,
  isGenerating: false,

  loadOutlines: async (projectId) => {
    set({ isLoading: true })
    try {
      const outlines = await window.api.outline.list(projectId)
      set({ outlines })
    } catch (error) {
      console.error('Failed to load outlines:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  createOutline: async (input) => {
    const outline = await window.api.outline.create(input)
    set((s) => ({ outlines: [outline, ...s.outlines] }))
    return outline
  },

  updateOutline: async (id, input) => {
    const updated = await window.api.outline.update(id, input)
    if (updated) {
      set((s) => ({
        outlines: s.outlines.map((o) => (o.id === id ? updated : o)),
        currentOutline: s.currentOutline?.id === id ? updated : s.currentOutline
      }))
    }
  },

  deleteOutline: async (id) => {
    await window.api.outline.delete(id)
    set((s) => ({
      outlines: s.outlines.filter((o) => o.id !== id),
      currentOutline: s.currentOutline?.id === id ? null : s.currentOutline
    }))
  },

  setCurrentOutline: (outline) => set({ currentOutline: outline })
}))
