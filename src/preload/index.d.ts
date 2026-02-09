import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Project,
  Chapter,
  AIProvider,
  AIStreamChunk,
  CreateProjectInput,
  UpdateProjectInput,
  CreateChapterInput,
  UpdateChapterInput,
  CreateAIProviderInput,
  UpdateAIProviderInput,
  AIRequestPayload
} from '../shared/types'

interface BenjiAPI {
  project: {
    list(): Promise<Project[]>
    get(id: number): Promise<Project | null>
    create(input: CreateProjectInput): Promise<Project>
    update(input: UpdateProjectInput): Promise<Project>
    delete(id: number): Promise<void>
  }
  chapter: {
    list(projectId: number): Promise<Chapter[]>
    get(id: number): Promise<Chapter | null>
    create(input: CreateChapterInput): Promise<Chapter>
    update(input: UpdateChapterInput): Promise<Chapter>
    delete(id: number): Promise<void>
    reorder(projectId: number, chapterIds: number[]): Promise<void>
  }
  aiProvider: {
    list(): Promise<AIProvider[]>
    get(id: number): Promise<AIProvider | null>
    create(input: CreateAIProviderInput): Promise<AIProvider>
    update(input: UpdateAIProviderInput): Promise<AIProvider>
    delete(id: number): Promise<void>
    test(id: number): Promise<{ success: boolean; message: string }>
  }
  ai: {
    chat(payload: AIRequestPayload): Promise<void>
    onStream(callback: (chunk: AIStreamChunk) => void): () => void
    cancelStream(): Promise<void>
  }
  settings: {
    get(key: string): Promise<unknown>
    set(key: string, value: unknown): Promise<void>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: BenjiAPI
  }
}
