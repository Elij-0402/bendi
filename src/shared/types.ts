// ============ Project ============
export interface Project {
  id: number
  title: string
  description: string
  genre: string
  targetWordCount: number
  currentWordCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateProjectInput {
  title: string
  description?: string
  genre?: string
  targetWordCount?: number
}

export interface UpdateProjectInput {
  id: number
  title?: string
  description?: string
  genre?: string
  targetWordCount?: number
}

// ============ Chapter ============
export interface Chapter {
  id: number
  projectId: number
  title: string
  content: string // Tiptap JSON string
  sortOrder: number
  wordCount: number
  status: ChapterStatus
  createdAt: string
  updatedAt: string
}

export type ChapterStatus = 'draft' | 'in_progress' | 'completed' | 'revision'

export interface CreateChapterInput {
  projectId: number
  title: string
  content?: string
  sortOrder?: number
}

export interface UpdateChapterInput {
  id: number
  title?: string
  content?: string
  sortOrder?: number
  wordCount?: number
  status?: ChapterStatus
}

// ============ AI Provider ============
export interface AIProvider {
  id: number
  name: string
  type: AIProviderType
  baseUrl: string
  model: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type AIProviderType = 'openai' | 'anthropic'

export interface CreateAIProviderInput {
  name: string
  type: AIProviderType
  baseUrl: string
  apiKey: string
  model: string
  isDefault?: boolean
}

export interface UpdateAIProviderInput {
  id: number
  name?: string
  type?: AIProviderType
  baseUrl?: string
  apiKey?: string
  model?: string
  isDefault?: boolean
}

// ============ AI Chat ============
export interface AIConversation {
  id: number
  projectId: number
  chapterId?: number
  title: string
  createdAt: string
}

export interface AIMessage {
  id: number
  conversationId: number
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

export type AIAction = 'continue' | 'polish' | 'rewrite' | 'chat'

export interface AIRequestPayload {
  action: AIAction
  providerId: number
  text: string
  context?: {
    chapterContent?: string
    characterInfo?: string
    worldInfo?: string
  }
  conversationHistory?: AIMessage[]
}

export interface AIStreamChunk {
  type: 'text' | 'error' | 'done'
  content: string
}

// ============ Character ============
export interface Character {
  id: number
  projectId: number
  name: string
  aliases: string
  role: CharacterRole
  appearance: string
  personality: string
  background: string
  customAttributes: string // JSON string
  createdAt: string
  updatedAt: string
}

export type CharacterRole = 'protagonist' | 'antagonist' | 'supporting' | 'minor'

// ============ World Setting ============
export interface WorldSetting {
  id: number
  projectId: number
  category: WorldSettingCategory
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export type WorldSettingCategory = 'geography' | 'history' | 'power_system' | 'culture' | 'technology' | 'other'

// ============ IPC Channels ============
export const IPC_CHANNELS = {
  // Project
  PROJECT_LIST: 'project:list',
  PROJECT_GET: 'project:get',
  PROJECT_CREATE: 'project:create',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',

  // Chapter
  CHAPTER_LIST: 'chapter:list',
  CHAPTER_GET: 'chapter:get',
  CHAPTER_CREATE: 'chapter:create',
  CHAPTER_UPDATE: 'chapter:update',
  CHAPTER_DELETE: 'chapter:delete',
  CHAPTER_REORDER: 'chapter:reorder',

  // Character
  CHARACTER_LIST: 'character:list',
  CHARACTER_GET: 'character:get',
  CHARACTER_CREATE: 'character:create',
  CHARACTER_UPDATE: 'character:update',
  CHARACTER_DELETE: 'character:delete',

  // AI
  AI_CHAT: 'ai:chat',
  AI_CHAT_STREAM: 'ai:chat:stream',
  AI_CHAT_CANCEL: 'ai:chat:cancel',

  // AI Provider
  AI_PROVIDER_LIST: 'ai:provider:list',
  AI_PROVIDER_GET: 'ai:provider:get',
  AI_PROVIDER_CREATE: 'ai:provider:create',
  AI_PROVIDER_UPDATE: 'ai:provider:update',
  AI_PROVIDER_DELETE: 'ai:provider:delete',
  AI_PROVIDER_TEST: 'ai:provider:test',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set'
} as const
