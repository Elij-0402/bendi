import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateChapterInput,
  UpdateChapterInput,
  CreateAIProviderInput,
  UpdateAIProviderInput,
  AIRequestPayload
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
    onStream: (callback: (chunk: { type: string; content: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, chunk: { type: string; content: string }) => callback(chunk)
      ipcRenderer.on(IPC_CHANNELS.AI_CHAT_STREAM, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.AI_CHAT_STREAM, handler)
    },
    cancelStream: () => ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT_CANCEL)
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    set: (key: string, value: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value)
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
