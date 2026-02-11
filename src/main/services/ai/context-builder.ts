import { CharacterRepository } from '../database/repositories/character.repository'
import { WorldSettingRepository } from '../database/repositories/world-setting.repository'
import { ChapterRepository } from '../database/repositories/chapter.repository'
import { OutlineRepository } from '../database/repositories/outline.repository'
import { StoryNoteRepository } from '../database/repositories/story-note.repository'
import { WritingStyleRepository } from '../database/repositories/writing-style.repository'
import type { Character, WorldSetting, OutlineNode } from '../../../shared/types'

const characterRepo = new CharacterRepository()
const worldSettingRepo = new WorldSettingRepository()
const chapterRepo = new ChapterRepository()
const outlineRepo = new OutlineRepository()
const storyNoteRepo = new StoryNoteRepository()
const writingStyleRepo = new WritingStyleRepository()

const CATEGORY_LABELS: Record<string, string> = {
  geography: '地理',
  history: '历史',
  power_system: '力量体系',
  culture: '文化',
  technology: '科技',
  other: '其他'
}

const ROLE_LABELS: Record<string, string> = {
  protagonist: '主角',
  antagonist: '反派',
  supporting: '配角',
  minor: '龙套'
}

function formatCharacter(c: Character): string {
  const parts = [`【${c.name}】（${ROLE_LABELS[c.role] || c.role}）`]
  if (c.aliases) parts.push(`别名：${c.aliases}`)
  if (c.appearance) parts.push(`外貌：${c.appearance}`)
  if (c.personality) parts.push(`性格：${c.personality}`)
  if (c.background) parts.push(`背景：${c.background}`)
  return parts.join('\n')
}

function formatCharacters(characters: Character[]): string {
  if (characters.length === 0) return ''
  // Sort: protagonist first, then antagonist, supporting, minor
  const roleOrder = { protagonist: 0, antagonist: 1, supporting: 2, minor: 3 }
  const sorted = [...characters].sort(
    (a, b) => (roleOrder[a.role] ?? 4) - (roleOrder[b.role] ?? 4)
  )
  return sorted.map(formatCharacter).join('\n\n')
}

function formatWorldSettings(settings: WorldSetting[]): string {
  if (settings.length === 0) return ''
  const grouped = new Map<string, WorldSetting[]>()
  for (const s of settings) {
    const list = grouped.get(s.category) || []
    list.push(s)
    grouped.set(s.category, list)
  }

  const parts: string[] = []
  for (const [category, items] of grouped) {
    const label = CATEGORY_LABELS[category] || category
    parts.push(`## ${label}`)
    for (const item of items) {
      parts.push(`### ${item.title}`)
      if (item.content) parts.push(item.content)
    }
  }
  return parts.join('\n')
}

function buildPreviousChaptersSummary(
  projectId: number,
  currentChapterId?: number
): string {
  const chapters = chapterRepo.findByProjectId(projectId)
  if (chapters.length === 0) return ''

  const relevantChapters = currentChapterId
    ? chapters.filter((c) => c.sortOrder < (chapters.find((ch) => ch.id === currentChapterId)?.sortOrder ?? Infinity))
    : chapters.slice(0, -1)

  if (relevantChapters.length === 0) return ''

  const summaries: string[] = []
  for (const chapter of relevantChapters) {
    if (!chapter.content) continue
    let text = ''
    try {
      const parsed = JSON.parse(chapter.content)
      // Extract text from Tiptap JSON
      text = extractTextFromTiptapJSON(parsed)
    } catch {
      text = chapter.content
    }
    // Take last 200 chars as summary
    const tail = text.length > 200 ? text.slice(-200) : text
    if (tail) {
      summaries.push(`第${chapter.sortOrder + 1}章「${chapter.title}」：...${tail}`)
    }
  }

  return summaries.join('\n\n')
}

function extractTextFromTiptapJSON(doc: { content?: Array<{ content?: Array<{ text?: string }> }> }): string {
  if (!doc.content) return ''
  const parts: string[] = []
  for (const node of doc.content) {
    if (node.content) {
      for (const inline of node.content) {
        if (inline.text) parts.push(inline.text)
      }
    }
    parts.push('\n')
  }
  return parts.join('').trim()
}

export interface ProjectContext {
  characterInfo: string
  worldInfo: string
  previousChapters: string
  outlineInfo: string
  styleInfo: string
  storyNotes: string
  currentChapterOutline: string
}

export function buildContextForProject(
  projectId: number,
  currentChapterId?: number
): ProjectContext {
  const characters = characterRepo.findByProjectId(projectId)
  const worldSettings = worldSettingRepo.findByProjectId(projectId)

  const characterInfo = formatCharacters(characters)
  const worldInfo = formatWorldSettings(worldSettings)
  const previousChapters = buildPreviousChaptersSummary(projectId, currentChapterId)
  const outlineInfo = buildOutlineContext(projectId)
  const styleInfo = ''
  const storyNotes = buildStoryNotesContext(projectId)
  const currentChapterOutline = currentChapterId
    ? buildCurrentChapterOutline(projectId, currentChapterId)
    : ''

  return { characterInfo, worldInfo, previousChapters, outlineInfo, styleInfo, storyNotes, currentChapterOutline }
}

function formatOutlineNode(node: OutlineNode, depth: number = 0): string {
  const indent = '  '.repeat(depth)
  let result = `${indent}${node.title}`
  if (node.description) {
    result += `：${node.description}`
  }
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      result += '\n' + formatOutlineNode(child, depth + 1)
    }
  }
  return result
}

export function buildOutlineContext(projectId: number, outlineId?: number): string {
  if (outlineId) {
    const outline = outlineRepo.getById(outlineId)
    if (!outline) return ''
    return outline.content.map((node) => formatOutlineNode(node)).join('\n')
  }
  const outlines = outlineRepo.listByProject(projectId)
  if (outlines.length === 0) return ''
  return outlines[0].content.map((node) => formatOutlineNode(node)).join('\n')
}

export function buildStyleContext(profileId: number): string {
  const profile = writingStyleRepo.getById(profileId)
  if (!profile || !profile.analysis) return ''
  const a = profile.analysis
  return `风格参考「${profile.name}」：语气${a.tone}，节奏${a.pacing}，词汇${a.vocabularyLevel}，句式${a.sentenceStructure}，叙事${a.narrativeVoice}`
}

export function buildStoryNotesContext(projectId: number, category?: string): string {
  const notes = storyNoteRepo.listByProject(projectId, category)
  if (notes.length === 0) return ''
  return notes.map((n) => `[${n.category}] ${n.title}：${n.content}`).join('\n')
}

function buildCurrentChapterOutline(projectId: number, chapterId: number): string {
  const chapter = chapterRepo.findByProjectId(projectId).find((c) => c.id === chapterId)
  if (!chapter) return ''

  const outlines = outlineRepo.listByProject(projectId)
  if (outlines.length === 0) return ''

  // Search through outline nodes for a node matching the chapter title or sort order
  const outline = outlines[0]
  const chapterIndex = chapter.sortOrder
  const matchingNode = findOutlineNodeByIndex(outline.content, chapterIndex)
  if (!matchingNode) return ''

  return `当前章节大纲要点：\n${formatOutlineNode(matchingNode)}`
}

function findOutlineNodeByIndex(nodes: OutlineNode[], index: number): OutlineNode | null {
  if (index >= 0 && index < nodes.length) {
    return nodes[index]
  }
  return null
}

export function buildSelectedTextContext(
  chapterContent: string,
  selectedText: string,
  surroundingChars: number = 300
): string {
  if (!chapterContent || !selectedText) return ''

  const selIndex = chapterContent.indexOf(selectedText)
  if (selIndex === -1) return ''

  const beforeStart = Math.max(0, selIndex - surroundingChars)
  const afterEnd = Math.min(chapterContent.length, selIndex + selectedText.length + surroundingChars)

  const before = chapterContent.slice(beforeStart, selIndex)
  const after = chapterContent.slice(selIndex + selectedText.length, afterEnd)

  const parts: string[] = []
  if (before) {
    parts.push(`【前文】\n...${before}`)
  }
  parts.push(`【选中文本】\n${selectedText}`)
  if (after) {
    parts.push(`【后文】\n${after}...`)
  }
  return parts.join('\n\n')
}

export function buildDialogueCharactersContext(
  projectId: number,
  characterNames?: string[]
): string {
  const allCharacters = characterRepo.findByProjectId(projectId)
  if (allCharacters.length === 0) return ''

  let dialogueCharacters: Character[]
  if (characterNames && characterNames.length > 0) {
    const nameSet = new Set(characterNames.map((n) => n.toLowerCase()))
    dialogueCharacters = allCharacters.filter(
      (c) =>
        nameSet.has(c.name.toLowerCase()) ||
        (c.aliases && c.aliases.split(/[,，、]/).some((a) => nameSet.has(a.trim().toLowerCase())))
    )
  } else {
    // Default to protagonist and antagonist for dialogue
    dialogueCharacters = allCharacters.filter(
      (c) => c.role === 'protagonist' || c.role === 'antagonist'
    )
  }

  if (dialogueCharacters.length === 0) return ''

  const parts = dialogueCharacters.map((c) => {
    const lines = [`【${c.name}】（${ROLE_LABELS[c.role] || c.role}）`]
    if (c.personality) lines.push(`性格：${c.personality}`)
    if (c.background) lines.push(`背景：${c.background}`)
    return lines.join('\n')
  })
  return '对话参与角色：\n' + parts.join('\n\n')
}
