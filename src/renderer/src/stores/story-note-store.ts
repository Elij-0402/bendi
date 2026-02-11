import { create } from 'zustand'
import type {
  StoryNote,
  StoryNoteCategory,
  CreateStoryNoteInput,
  UpdateStoryNoteInput
} from '../../../shared/types'

interface StoryNoteState {
  notes: StoryNote[]
  currentNote: StoryNote | null
  isLoading: boolean
  filterCategory: StoryNoteCategory | null

  loadNotes: (projectId: number, category?: StoryNoteCategory) => Promise<void>
  createNote: (input: CreateStoryNoteInput) => Promise<StoryNote>
  updateNote: (id: number, input: UpdateStoryNoteInput) => Promise<void>
  deleteNote: (id: number) => Promise<void>
  setCurrentNote: (note: StoryNote | null) => void
  setFilterCategory: (category: StoryNoteCategory | null) => void
}

export const useStoryNoteStore = create<StoryNoteState>()((set, get) => ({
  notes: [],
  currentNote: null,
  isLoading: false,
  filterCategory: null,

  loadNotes: async (projectId, category?) => {
    set({ isLoading: true })
    try {
      const notes = await window.api.storyNote.list(projectId, category ?? undefined)
      set({ notes })
    } catch (error) {
      console.error('Failed to load story notes:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  createNote: async (input) => {
    const note = await window.api.storyNote.create(input)
    set((s) => ({ notes: [note, ...s.notes] }))
    return note
  },

  updateNote: async (id, input) => {
    const updated = await window.api.storyNote.update(id, input)
    if (updated) {
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? updated : n)),
        currentNote: s.currentNote?.id === id ? updated : s.currentNote
      }))
    }
  },

  deleteNote: async (id) => {
    await window.api.storyNote.delete(id)
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      currentNote: s.currentNote?.id === id ? null : s.currentNote
    }))
  },

  setCurrentNote: (note) => set({ currentNote: note }),

  setFilterCategory: (category) => set({ filterCategory: category })
}))
