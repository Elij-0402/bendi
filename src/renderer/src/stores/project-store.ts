import { create } from 'zustand'
import type { Project, Chapter, UpdateChapterInput } from '../../../shared/types'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  chapters: Chapter[]
  currentChapter: Chapter | null
  isLoading: boolean

  // Actions
  loadProjects: () => Promise<void>
  createProject: (title: string, description?: string, genre?: string) => Promise<Project>
  deleteProject: (id: number) => Promise<void>
  setCurrentProject: (project: Project | null) => void

  loadChapters: (projectId: number) => Promise<void>
  createChapter: (projectId: number, title: string) => Promise<Chapter>
  updateChapter: (input: UpdateChapterInput) => Promise<void>
  deleteChapter: (id: number) => Promise<void>
  setCurrentChapter: (chapter: Chapter | null) => void
  reorderChapters: (projectId: number, chapterIds: number[]) => Promise<void>
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  currentProject: null,
  chapters: [],
  currentChapter: null,
  isLoading: false,

  loadProjects: async () => {
    set({ isLoading: true })
    try {
      const projects = await window.api.project.list()
      set({ projects })
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  createProject: async (title: string, description?: string, genre?: string) => {
    const project = await window.api.project.create({ title, description, genre })
    set((state) => ({ projects: [...state.projects, project] }))
    return project
  },

  deleteProject: async (id: number) => {
    await window.api.project.delete(id)
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject
    }))
  },

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project })
  },

  loadChapters: async (projectId: number) => {
    set({ isLoading: true })
    try {
      const chapters = await window.api.chapter.list(projectId)
      set({ chapters })
    } catch (error) {
      console.error('Failed to load chapters:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  createChapter: async (projectId: number, title: string) => {
    const { chapters } = get()
    const sortOrder = chapters.length
    const chapter = await window.api.chapter.create({ projectId, title, sortOrder })
    set((state) => ({ chapters: [...state.chapters, chapter] }))
    return chapter
  },

  updateChapter: async (input: UpdateChapterInput) => {
    const updated = await window.api.chapter.update(input)
    set((state) => ({
      chapters: state.chapters.map((ch) => (ch.id === updated.id ? updated : ch)),
      currentChapter: state.currentChapter?.id === updated.id ? updated : state.currentChapter
    }))
  },

  deleteChapter: async (id: number) => {
    await window.api.chapter.delete(id)
    set((state) => ({
      chapters: state.chapters.filter((ch) => ch.id !== id),
      currentChapter: state.currentChapter?.id === id ? null : state.currentChapter
    }))
  },

  setCurrentChapter: (chapter: Chapter | null) => {
    set({ currentChapter: chapter })
  },

  reorderChapters: async (projectId: number, chapterIds: number[]) => {
    await window.api.chapter.reorder(projectId, chapterIds)
    // Re-sort local chapters based on the new order
    set((state) => {
      const chapterMap = new Map(state.chapters.map((ch) => [ch.id, ch]))
      const reordered = chapterIds
        .map((id, index) => {
          const ch = chapterMap.get(id)
          return ch ? { ...ch, sortOrder: index } : null
        })
        .filter(Boolean) as Chapter[]
      return { chapters: reordered }
    })
  }
}))
