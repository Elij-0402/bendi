import type { ExportFormat, ExportOptions } from '../../shared/types'

interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  attrs?: Record<string, unknown>
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

/**
 * Converts Tiptap JSON document to plain text.
 */
export function tiptapToText(content: string): string {
  try {
    const doc: TiptapNode = JSON.parse(content)
    return renderNodeAsText(doc).trim()
  } catch {
    return content || ''
  }
}

/**
 * Converts Tiptap JSON document to Markdown.
 */
export function tiptapToMarkdown(content: string): string {
  try {
    const doc: TiptapNode = JSON.parse(content)
    return renderNodeAsMarkdown(doc).trim()
  } catch {
    return content || ''
  }
}

function renderNodeAsText(node: TiptapNode): string {
  if (node.text) return node.text

  if (!node.content) {
    if (node.type === 'horizontalRule') return '\n---\n'
    if (node.type === 'hardBreak') return '\n'
    return ''
  }

  const childText = node.content.map(renderNodeAsText).join('')

  switch (node.type) {
    case 'doc':
      return childText
    case 'paragraph':
      return childText + '\n\n'
    case 'heading':
      return childText + '\n\n'
    case 'blockquote':
      return childText
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => `  ${l}`)
        .join('\n') + '\n\n'
    case 'bulletList':
    case 'orderedList':
      return childText + '\n'
    case 'listItem':
      return `- ${childText.trim()}\n`
    case 'codeBlock':
      return childText + '\n\n'
    default:
      return childText
  }
}

function renderInlineMarkdown(node: TiptapNode): string {
  let text = node.text || ''
  if (node.marks) {
    for (const mark of node.marks) {
      switch (mark.type) {
        case 'bold':
          text = `**${text}**`
          break
        case 'italic':
          text = `*${text}*`
          break
        case 'underline':
          text = `<u>${text}</u>`
          break
        case 'code':
          text = `\`${text}\``
          break
        case 'strike':
          text = `~~${text}~~`
          break
      }
    }
  }
  return text
}

function renderNodeAsMarkdown(node: TiptapNode): string {
  if (node.text) return renderInlineMarkdown(node)

  if (!node.content) {
    if (node.type === 'horizontalRule') return '\n---\n\n'
    if (node.type === 'hardBreak') return '  \n'
    return ''
  }

  const childMd = node.content.map(renderNodeAsMarkdown).join('')

  switch (node.type) {
    case 'doc':
      return childMd
    case 'paragraph':
      return childMd + '\n\n'
    case 'heading': {
      const level = (node.attrs?.level as number) || 1
      const prefix = '#'.repeat(level)
      return `${prefix} ${childMd.trim()}\n\n`
    }
    case 'blockquote':
      return childMd
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => `> ${l}`)
        .join('\n') + '\n\n'
    case 'bulletList':
      return childMd + '\n'
    case 'orderedList':
      return childMd + '\n'
    case 'listItem':
      return `- ${childMd.trim()}\n`
    case 'codeBlock': {
      const lang = (node.attrs?.language as string) || ''
      return `\`\`\`${lang}\n${childMd.trim()}\n\`\`\`\n\n`
    }
    default:
      return childMd
  }
}

interface ChapterData {
  title: string
  content: string
}

/**
 * Formats multiple chapters into a single export string.
 */
export function formatChaptersForExport(
  chapters: ChapterData[],
  options: ExportOptions
): string {
  const parts: string[] = []
  const separator = options.separator || (options.format === 'markdown' ? '\n\n---\n\n' : '\n\n')

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]
    const convertedContent =
      options.format === 'markdown'
        ? tiptapToMarkdown(chapter.content)
        : tiptapToText(chapter.content)

    let chapterOutput = ''

    if (options.includeTitle) {
      if (options.format === 'markdown') {
        chapterOutput += `# ${chapter.title}\n\n`
      } else {
        chapterOutput += `${chapter.title}\n\n`
      }
    }

    chapterOutput += convertedContent

    parts.push(chapterOutput)
  }

  return parts.join(separator).trim() + '\n'
}

/**
 * Returns the file extension for a given export format.
 */
export function getFileExtension(format: ExportFormat): string {
  return format === 'markdown' ? 'md' : 'txt'
}

/**
 * Returns the file filter for Electron save dialog.
 */
export function getFileFilter(format: ExportFormat): { name: string; extensions: string[] } {
  return format === 'markdown'
    ? { name: 'Markdown', extensions: ['md'] }
    : { name: 'Text', extensions: ['txt'] }
}
