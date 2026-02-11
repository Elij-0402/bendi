import { create } from 'zustand'
import type {
  WritingStyleProfile,
  CreateWritingStyleInput,
  UpdateWritingStyleInput
} from '../../../shared/types'

interface WritingStyleState {
  profiles: WritingStyleProfile[]
  currentProfile: WritingStyleProfile | null
  isLoading: boolean
  isAnalyzing: boolean

  loadProfiles: (projectId: number | null) => Promise<void>
  createProfile: (input: CreateWritingStyleInput) => Promise<WritingStyleProfile>
  updateProfile: (id: number, input: UpdateWritingStyleInput) => Promise<void>
  deleteProfile: (id: number) => Promise<void>
  analyzeStyle: (id: number) => Promise<void>
  setCurrentProfile: (profile: WritingStyleProfile | null) => void
}

export const useWritingStyleStore = create<WritingStyleState>()((set, get) => ({
  profiles: [],
  currentProfile: null,
  isLoading: false,
  isAnalyzing: false,

  loadProfiles: async (projectId) => {
    set({ isLoading: true })
    try {
      const profiles = await window.api.writingStyle.list(projectId)
      set({ profiles })
    } catch (error) {
      console.error('Failed to load writing style profiles:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  createProfile: async (input) => {
    const profile = await window.api.writingStyle.create(input)
    set((s) => ({ profiles: [profile, ...s.profiles] }))
    return profile
  },

  updateProfile: async (id, input) => {
    const updated = await window.api.writingStyle.update(id, input)
    if (updated) {
      set((s) => ({
        profiles: s.profiles.map((p) => (p.id === id ? updated : p)),
        currentProfile: s.currentProfile?.id === id ? updated : s.currentProfile
      }))
    }
  },

  deleteProfile: async (id) => {
    await window.api.writingStyle.delete(id)
    set((s) => ({
      profiles: s.profiles.filter((p) => p.id !== id),
      currentProfile: s.currentProfile?.id === id ? null : s.currentProfile
    }))
  },

  analyzeStyle: async (id) => {
    set({ isAnalyzing: true })
    try {
      const result = await window.api.writingStyle.analyze(id)
      if (result) {
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? result : p)),
          currentProfile: s.currentProfile?.id === id ? result : s.currentProfile
        }))
      }
    } catch (error) {
      console.error('Failed to analyze writing style:', error)
    } finally {
      set({ isAnalyzing: false })
    }
  },

  setCurrentProfile: (profile) => set({ currentProfile: profile })
}))
