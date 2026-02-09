import type { AIAction } from '../../../shared/types'

interface PromptContext {
  text: string
  chapterContent?: string
  characterInfo?: string
  worldInfo?: string
}

const SYSTEM_PROMPTS: Record<AIAction, string> = {
  continue:
    '你是一位专业的小说作家。请根据已有内容，续写接下来的段落。保持与原文一致的写作风格、语气和叙事视角。',
  polish:
    '你是一位专业的文学编辑。请对以下文字进行润色和优化，提升文字的表达力和可读性，但不改变原文的核心意思和情节走向。直接输出润色后的文字，不要附带解释。',
  rewrite:
    '你是一位专业的小说作家。请用不同的表达方式改写以下内容，保持核心情节不变但改变叙述方式。直接输出改写后的文字，不要附带解释。',
  chat:
    '你是一位经验丰富的小说写作助手。帮助作者解答创作中的问题，提供写作建议和灵感。'
}

const USER_PROMPTS: Record<AIAction, (context: PromptContext) => string> = {
  continue: (ctx) => {
    let prompt = '请续写以下内容：\n\n'
    if (ctx.chapterContent) {
      prompt += `【章节上下文】\n${ctx.chapterContent}\n\n`
    }
    prompt += `【当前文本】\n${ctx.text}`
    return prompt
  },
  polish: (ctx) => {
    return `请润色以下文字：\n\n${ctx.text}`
  },
  rewrite: (ctx) => {
    return `请改写以下内容：\n\n${ctx.text}`
  },
  chat: (ctx) => {
    return ctx.text
  }
}

export function buildPrompt(
  action: AIAction,
  context: PromptContext
): Array<{ role: 'system' | 'user'; content: string }> {
  let systemPrompt = SYSTEM_PROMPTS[action]

  // Append character and world info as reference material
  if (context.characterInfo) {
    systemPrompt += `\n\n【角色参考资料】\n${context.characterInfo}`
  }
  if (context.worldInfo) {
    systemPrompt += `\n\n【世界观参考资料】\n${context.worldInfo}`
  }

  const userMessage = USER_PROMPTS[action](context)

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ]
}
