import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateChapterInput,
  UpdateChapterInput,
  CreateCharacterInput,
  UpdateCharacterInput,
  CreateWorldSettingInput,
  UpdateWorldSettingInput,
  CreateAIProviderInput,
  UpdateAIProviderInput,
  AIRequestPayload,
  AIStreamChunk,
  CreateOutlineInput,
  UpdateOutlineInput,
  CreateStoryNoteInput,
  UpdateStoryNoteInput,
  CreateWritingStyleInput,
  UpdateWritingStyleInput,
  ExportOptions
} from '../shared/types'
import { IPC_CHANNELS } from '../shared/types'

const api = {
  // Project
  project: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_LIST),
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET, id),
    create: (input: CreateProjectInput) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CREATE, input),
    update: (input: UpdateProjectInput) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_UPDATE, input),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_DELETE, id)
  },

  // Chapter
  chapter: {
    list: (projectId: number) => ipcRenderer.invoke(IPC_CHANNELS.CHAPTER_LIST, projectId),
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.CHAPTER_GET, id),
    create: (input: CreateChapterInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.CHAPTER_CREATE, input),
    update: (input: UpdateChapterInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.CHAPTER_UPDATE, input),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.CHAPTER_DELETE, id),
    reorder: (projectId: number, chapterIds: number[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.CHAPTER_REORDER, projectId, chapterIds)
  },

  // Character
  character: {
    list: (projectId: number) => ipcRenderer.invoke(IPC_CHANNELS.CHARACTER_LIST, projectId),
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.CHARACTER_GET, id),
    create: (input: CreateCharacterInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.CHARACTER_CREATE, input),
    update: (input: UpdateCharacterInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.CHARACTER_UPDATE, input),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.CHARACTER_DELETE, id)
  },

  // World Setting
  worldSetting: {
    list: (projectId: number) => ipcRenderer.invoke(IPC_CHANNELS.WORLD_SETTING_LIST, projectId),
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.WORLD_SETTING_GET, id),
    create: (input: CreateWorldSettingInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORLD_SETTING_CREATE, input),
    update: (input: UpdateWorldSettingInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.WORLD_SETTING_UPDATE, input),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.WORLD_SETTING_DELETE, id)
  },

  // AI Provider
  aiProvider: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.AI_PROVIDER_LIST),
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.AI_PROVIDER_GET, id),
    create: (input: CreateAIProviderInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_PROVIDER_CREATE, input),
    update: (input: UpdateAIProviderInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_PROVIDER_UPDATE, input),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.AI_PROVIDER_DELETE, id),
    test: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.AI_PROVIDER_TEST, id)
  },

  // AI Chat
  ai: {
    chat: (payload: AIRequestPayload) => ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, payload),
    onStream: (callback: (chunk: AIStreamChunk) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, chunk: AIStreamChunk) => callback(chunk)
      ipcRenderer.on(IPC_CHANNELS.AI_CHAT_STREAM, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.AI_CHAT_STREAM, handler)
    },
    cancelStream: (source?: 'chat' | 'inline') => ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT_CANCEL, source),
    loadConversation: (projectId: number, chapterId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CONVERSATION_LOAD, projectId, chapterId),
    clearConversation: (projectId: number, chapterId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CONVERSATION_CLEAR, projectId, chapterId),
    // Convenience methods for new AI actions
    describe: (payload: Omit<AIRequestPayload, 'action'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, { ...payload, action: 'describe' as const }),
    brainstorm: (payload: Omit<AIRequestPayload, 'action'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, { ...payload, action: 'brainstorm' as const }),
    expand: (payload: Omit<AIRequestPayload, 'action'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, { ...payload, action: 'expand' as const }),
    shrink: (payload: Omit<AIRequestPayload, 'action'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, { ...payload, action: 'shrink' as const }),
    feedback: (payload: Omit<AIRequestPayload, 'action'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, { ...payload, action: 'feedback' as const }),
    twist: (payload: Omit<AIRequestPayload, 'action'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, { ...payload, action: 'twist' as const }),
    povChange: (payload: Omit<AIRequestPayload, 'action'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, { ...payload, action: 'pov_change' as const }),
    dialogue: (payload: Omit<AIRequestPayload, 'action'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, { ...payload, action: 'dialogue' as const }),
    storyEngine: (payload: Omit<AIRequestPayload, 'action'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, { ...payload, action: 'story_engine' as const }),
    outlineGenerate: (payload: Omit<AIRequestPayload, 'action'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.OUTLINE_GENERATE, { ...payload, action: 'outline' as const })
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    set: (key: string, value: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value)
  },

  // Outline
  outline: {
    list: (projectId: number) => ipcRenderer.invoke(IPC_CHANNELS.OUTLINE_LIST, projectId),
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.OUTLINE_GET, id),
    create: (input: CreateOutlineInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.OUTLINE_CREATE, input),
    update: (id: number, input: UpdateOutlineInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.OUTLINE_UPDATE, id, input),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.OUTLINE_DELETE, id),
    generate: (payload: AIRequestPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.OUTLINE_GENERATE, payload)
  },

  // Story Notes
  storyNote: {
    list: (projectId: number, category?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.STORY_NOTE_LIST, projectId, category),
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.STORY_NOTE_GET, id),
    create: (input: CreateStoryNoteInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.STORY_NOTE_CREATE, input),
    update: (id: number, input: UpdateStoryNoteInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.STORY_NOTE_UPDATE, id, input),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.STORY_NOTE_DELETE, id)
  },

  // Writing Style
  writingStyle: {
    list: (projectId: number | null) =>
      ipcRenderer.invoke(IPC_CHANNELS.STYLE_PROFILE_LIST, projectId),
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.STYLE_PROFILE_GET, id),
    create: (input: CreateWritingStyleInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.STYLE_PROFILE_CREATE, input),
    update: (id: number, input: UpdateWritingStyleInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.STYLE_PROFILE_UPDATE, id, input),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.STYLE_PROFILE_DELETE, id),
    analyze: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.STYLE_PROFILE_ANALYZE, id)
  },

  // Generation History
  generationHistory: {
    list: (projectId: number, options?: { action?: string; chapterId?: number; limit?: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.GENERATION_HISTORY_LIST, projectId, options),
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.GENERATION_HISTORY_GET, id),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.GENERATION_HISTORY_DELETE, id),
    clear: (projectId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.GENERATION_HISTORY_CLEAR, projectId)
  },

  // Export
  export: {
    file: (projectId: number, options: ExportOptions) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_FILE, projectId, options),
    toTxt: (projectId: number, options?: Partial<Omit<ExportOptions, 'format'>>) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_FILE, projectId, {
        format: 'txt' as const,
        scope: 'all' as const,
        includeTitle: true,
        separator: '\n\n',
        ...options
      }),
    toMarkdown: (projectId: number, options?: Partial<Omit<ExportOptions, 'format'>>) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_FILE, projectId, {
        format: 'markdown' as const,
        scope: 'all' as const,
        includeTitle: true,
        separator: '\n\n---\n\n',
        ...options
      })
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
