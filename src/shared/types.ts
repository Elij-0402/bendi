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

export type AIAction = 'continue' | 'polish' | 'rewrite' | 'chat' | 'describe' | 'brainstorm' | 'expand' | 'shrink' | 'feedback' | 'twist' | 'pov_change' | 'dialogue' | 'outline' | 'style_analysis' | 'story_engine'

export interface GenerationOptions {
  targetLength?: 'short' | 'medium' | 'long' | number
  tone?: string
  styleNote?: string
  temperature?: number
}

export interface AIRequestPayload {
  action: AIAction
  providerId: number
  text: string
  source?: 'chat' | 'inline'
  requestId?: string
  conversationId?: number
  context?: {
    chapterContent?: string
    characterInfo?: string
    worldInfo?: string
    projectId?: number
    chapterId?: number
    previousChapters?: string
  }
  generationOptions?: GenerationOptions
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  brainstormType?: BrainstormType
  senses?: SenseType[]
  targetPOV?: POVType
  selectedText?: string
  outlineId?: number
  styleProfileId?: number
}

export interface AIStreamChunk {
  type: 'text' | 'error' | 'done'
  content: string
  source?: 'chat' | 'inline'
  requestId?: string
  conversationId?: number
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

export interface CreateCharacterInput {
  projectId: number
  name: string
  aliases?: string
  role?: CharacterRole
  appearance?: string
  personality?: string
  background?: string
  customAttributes?: string
}

export interface UpdateCharacterInput {
  id: number
  name?: string
  aliases?: string
  role?: CharacterRole
  appearance?: string
  personality?: string
  background?: string
  customAttributes?: string
}

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

export interface CreateWorldSettingInput {
  projectId: number
  category: WorldSettingCategory
  title: string
  content?: string
}

export interface UpdateWorldSettingInput {
  id: number
  category?: WorldSettingCategory
  title?: string
  content?: string
}

// ============ Outline ============
export type OutlineType = 'beat_sheet' | 'chapter_outline' | 'synopsis' | 'scene_outline'

export interface OutlineNode {
  id: string
  title: string
  description: string
  children?: OutlineNode[]
}

export interface Outline {
  id: number
  projectId: number
  type: OutlineType
  title: string
  content: OutlineNode[]
  createdAt: string
  updatedAt: string
}

export interface CreateOutlineInput {
  projectId: number
  type: OutlineType
  title: string
  content: OutlineNode[]
}

export interface UpdateOutlineInput {
  title?: string
  content?: OutlineNode[]
}

// ============ Story Note ============
export type StoryNoteCategory = 'plot' | 'character' | 'scene' | 'research' | 'idea' | 'other'

export interface StoryNote {
  id: number
  projectId: number
  category: StoryNoteCategory
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateStoryNoteInput {
  projectId: number
  category: StoryNoteCategory
  title: string
  content: string
  tags?: string[]
}

export interface UpdateStoryNoteInput {
  category?: StoryNoteCategory
  title?: string
  content?: string
  tags?: string[]
}

// ============ Writing Style ============
export interface StyleAnalysis {
  tone: string
  pacing: string
  vocabularyLevel: string
  sentenceStructure: string
  narrativeVoice: string
  rhetoricalDevices: string[]
  summary: string
}

export interface WritingStyleProfile {
  id: number
  projectId: number | null
  name: string
  sampleText: string
  analysis: StyleAnalysis | null
  createdAt: string
  updatedAt: string
}

export interface CreateWritingStyleInput {
  projectId?: number | null
  name: string
  sampleText: string
}

export interface UpdateWritingStyleInput {
  name?: string
  sampleText?: string
  analysis?: StyleAnalysis | null
}

// ============ Generation History ============
export interface GenerationHistory {
  id: number
  projectId: number
  chapterId: number | null
  action: AIAction
  inputText: string
  outputText: string
  options: GenerationOptions | null
  accepted: boolean
  createdAt: string
}

// ============ Brainstorm & Sense & POV ============
export type BrainstormType = 'plot' | 'character' | 'dialogue' | 'scene' | 'conflict'

export type SenseType = 'sight' | 'sound' | 'smell' | 'taste' | 'touch'

export type POVType = 'first_person' | 'third_person_limited' | 'third_person_omniscient' | 'second_person'

// ============ Beat Sheet Template ============
export type BeatSheetTemplateType = 'three_act' | 'heros_journey' | 'qi_cheng_zhuan_he' | 'save_the_cat' | 'custom'

// ============ Export ============
export type ExportFormat = 'txt' | 'markdown'

export interface ExportOptions {
  format: ExportFormat
  scope: 'all' | 'selected' | 'current'
  chapterIds?: number[]
  includeTitle: boolean
  separator: string
}

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

  // World Setting
  WORLD_SETTING_LIST: 'world-setting:list',
  WORLD_SETTING_GET: 'world-setting:get',
  WORLD_SETTING_CREATE: 'world-setting:create',
  WORLD_SETTING_UPDATE: 'world-setting:update',
  WORLD_SETTING_DELETE: 'world-setting:delete',

  // AI
  AI_CHAT: 'ai:chat',
  AI_CHAT_STREAM: 'ai:chat:stream',
  AI_CHAT_CANCEL: 'ai:chat:cancel',
  AI_CONVERSATION_LOAD: 'ai:conversation:load',
  AI_CONVERSATION_CLEAR: 'ai:conversation:clear',

  // AI Provider
  AI_PROVIDER_LIST: 'ai:provider:list',
  AI_PROVIDER_GET: 'ai:provider:get',
  AI_PROVIDER_CREATE: 'ai:provider:create',
  AI_PROVIDER_UPDATE: 'ai:provider:update',
  AI_PROVIDER_DELETE: 'ai:provider:delete',
  AI_PROVIDER_TEST: 'ai:provider:test',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Outline
  OUTLINE_LIST: 'outline:list',
  OUTLINE_GET: 'outline:get',
  OUTLINE_CREATE: 'outline:create',
  OUTLINE_UPDATE: 'outline:update',
  OUTLINE_DELETE: 'outline:delete',
  OUTLINE_GENERATE: 'outline:generate',

  // Story Notes
  STORY_NOTE_LIST: 'story-note:list',
  STORY_NOTE_GET: 'story-note:get',
  STORY_NOTE_CREATE: 'story-note:create',
  STORY_NOTE_UPDATE: 'story-note:update',
  STORY_NOTE_DELETE: 'story-note:delete',

  // Writing Style
  STYLE_PROFILE_LIST: 'style-profile:list',
  STYLE_PROFILE_GET: 'style-profile:get',
  STYLE_PROFILE_CREATE: 'style-profile:create',
  STYLE_PROFILE_UPDATE: 'style-profile:update',
  STYLE_PROFILE_DELETE: 'style-profile:delete',
  STYLE_PROFILE_ANALYZE: 'style-profile:analyze',

  // Generation History
  GENERATION_HISTORY_LIST: 'generation-history:list',
  GENERATION_HISTORY_GET: 'generation-history:get',
  GENERATION_HISTORY_DELETE: 'generation-history:delete',
  GENERATION_HISTORY_CLEAR: 'generation-history:clear',

  // Export
  EXPORT_FILE: 'export:file'
} as const
