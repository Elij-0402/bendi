import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Project,
  Chapter,
  AIConversation,
  AIMessage,
  Character,
  WorldSetting,
  AIProvider,
  AIStreamChunk,
  Outline,
  StoryNote,
  WritingStyleProfile,
  GenerationHistory,
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
  CreateOutlineInput,
  UpdateOutlineInput,
  CreateStoryNoteInput,
  UpdateStoryNoteInput,
  CreateWritingStyleInput,
  UpdateWritingStyleInput,
  ExportOptions
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
  character: {
    list(projectId: number): Promise<Character[]>
    get(id: number): Promise<Character | null>
    create(input: CreateCharacterInput): Promise<Character>
    update(input: UpdateCharacterInput): Promise<Character>
    delete(id: number): Promise<void>
  }
  worldSetting: {
    list(projectId: number): Promise<WorldSetting[]>
    get(id: number): Promise<WorldSetting | null>
    create(input: CreateWorldSettingInput): Promise<WorldSetting>
    update(input: UpdateWorldSettingInput): Promise<WorldSetting>
    delete(id: number): Promise<void>
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
    cancelStream(source?: 'chat' | 'inline'): Promise<void>
    loadConversation(
      projectId: number,
      chapterId?: number
    ): Promise<{ conversation: AIConversation | null; messages: AIMessage[] }>
    clearConversation(projectId: number, chapterId?: number): Promise<{ success: boolean }>
    describe(payload: Omit<AIRequestPayload, 'action'>): Promise<void>
    brainstorm(payload: Omit<AIRequestPayload, 'action'>): Promise<void>
    expand(payload: Omit<AIRequestPayload, 'action'>): Promise<void>
    shrink(payload: Omit<AIRequestPayload, 'action'>): Promise<void>
    feedback(payload: Omit<AIRequestPayload, 'action'>): Promise<void>
    twist(payload: Omit<AIRequestPayload, 'action'>): Promise<void>
    povChange(payload: Omit<AIRequestPayload, 'action'>): Promise<void>
    dialogue(payload: Omit<AIRequestPayload, 'action'>): Promise<void>
    storyEngine(payload: Omit<AIRequestPayload, 'action'>): Promise<void>
    outlineGenerate(payload: Omit<AIRequestPayload, 'action'>): Promise<void>
  }
  settings: {
    get(key: string): Promise<unknown>
    set(key: string, value: unknown): Promise<void>
  }
  outline: {
    list(projectId: number): Promise<Outline[]>
    get(id: number): Promise<Outline | null>
    create(input: CreateOutlineInput): Promise<Outline>
    update(id: number, input: UpdateOutlineInput): Promise<Outline | null>
    delete(id: number): Promise<{ success: boolean }>
    generate(payload: AIRequestPayload): Promise<void>
  }
  storyNote: {
    list(projectId: number, category?: string): Promise<StoryNote[]>
    get(id: number): Promise<StoryNote | null>
    create(input: CreateStoryNoteInput): Promise<StoryNote>
    update(id: number, input: UpdateStoryNoteInput): Promise<StoryNote | null>
    delete(id: number): Promise<{ success: boolean }>
  }
  writingStyle: {
    list(projectId: number | null): Promise<WritingStyleProfile[]>
    get(id: number): Promise<WritingStyleProfile | null>
    create(input: CreateWritingStyleInput): Promise<WritingStyleProfile>
    update(id: number, input: UpdateWritingStyleInput): Promise<WritingStyleProfile | null>
    delete(id: number): Promise<{ success: boolean }>
    analyze(id: number): Promise<WritingStyleProfile | null>
  }
  generationHistory: {
    list(projectId: number, options?: { action?: string; chapterId?: number; limit?: number }): Promise<GenerationHistory[]>
    get(id: number): Promise<GenerationHistory | null>
    delete(id: number): Promise<{ success: boolean }>
    clear(projectId: number): Promise<{ success: boolean }>
  }
  export: {
    file(projectId: number, options: ExportOptions): Promise<{ success: boolean; filePath?: string; error?: string }>
    toTxt(projectId: number, options?: Partial<Omit<ExportOptions, 'format'>>): Promise<{ success: boolean; filePath?: string; error?: string }>
    toMarkdown(projectId: number, options?: Partial<Omit<ExportOptions, 'format'>>): Promise<{ success: boolean; filePath?: string; error?: string }>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: BenjiAPI
  }
}
