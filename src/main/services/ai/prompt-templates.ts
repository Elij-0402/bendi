import type { AIAction, GenerationOptions, BrainstormType, SenseType, POVType } from '../../../shared/types'

interface PromptContext {
  text: string
  chapterContent?: string
  characterInfo?: string
  worldInfo?: string
  previousChapters?: string
  generationOptions?: GenerationOptions
  brainstormType?: BrainstormType
  senses?: SenseType[]
  targetPOV?: POVType
  selectedText?: string
  outlineContent?: string
  styleProfile?: string
  selectedTextContext?: string
  dialogueCharacterInfo?: string
}

function buildGenerationInstructions(options?: GenerationOptions): string {
  if (!options) return ''
  const parts: string[] = []

  if (options.targetLength) {
    if (options.targetLength === 'short') {
      parts.push('生成长度约100-200字')
    } else if (options.targetLength === 'medium') {
      parts.push('生成长度约300-500字')
    } else if (options.targetLength === 'long') {
      parts.push('生成长度约500-1000字')
    } else if (typeof options.targetLength === 'number') {
      parts.push(`生成长度约${options.targetLength}字`)
    }
  }

  if (options.tone) {
    parts.push(`语调风格：${options.tone}`)
  }

  if (options.styleNote) {
    parts.push(`写作要求：${options.styleNote}`)
  }

  return parts.length > 0 ? '\n\n【生成要求】\n' + parts.join('\n') : ''
}

function formatSenses(senses?: SenseType[]): string {
  if (!senses || senses.length === 0) return ''
  const senseMap: Record<SenseType, string> = {
    sight: '视觉',
    sound: '听觉',
    smell: '嗅觉',
    taste: '味觉',
    touch: '触觉'
  }
  return senses.map((s) => senseMap[s]).join('、')
}

function formatPOV(pov?: POVType): string {
  if (!pov) return '第三人称有限'
  const povMap: Record<POVType, string> = {
    first_person: '第一人称',
    third_person_limited: '第三人称有限',
    third_person_omniscient: '第三人称全知',
    second_person: '第二人称'
  }
  return povMap[pov]
}

function formatBrainstormType(type?: BrainstormType): string {
  if (!type) return '情节'
  const typeMap: Record<BrainstormType, string> = {
    plot: '情节发展',
    character: '角色塑造',
    dialogue: '对话设计',
    scene: '场景构思',
    conflict: '冲突设计'
  }
  return typeMap[type]
}

const SYSTEM_PROMPTS: Record<AIAction, string> = {
  continue:
    '你是一位专业的小说作家。请根据已有内容，续写接下来的段落。保持与原文一致的写作风格、语气和叙事视角。如果提供了角色信息和世界观设定，请确保续写内容与之保持一致。',
  polish:
    '你是一位专业的文学编辑。请对以下文字进行润色和优化，提升文字的表达力和可读性，但不改变原文的核心意思和情节走向。直接输出润色后的文字，不要附带解释。',
  rewrite:
    '你是一位专业的小说作家。请用不同的表达方式改写以下内容，保持核心情节不变但改变叙述方式。直接输出改写后的文字，不要附带解释。',
  chat: '你是一位经验丰富的小说写作助手。帮助作者解答创作中的问题，提供写作建议和灵感。',
  describe:
    '你是一位善于刻画细节的小说家。根据给定的场景或对象，从不同感官维度生成生动、沉浸式的描写。请直接输出描写文本，不要添加解释说明。',
  brainstorm:
    '你是一位经验丰富的创意顾问。根据当前故事背景和需求，生成多个富有创意的方向。请以编号列表形式输出，每个创意包含简短标题和详细说明。',
  expand:
    '你是一位细腻的小说家。将给定的简短段落扩展为详细、生动的叙述，增加细节描写、人物心理、环境氛围和感官体验。保持原文的核心内容和风格不变。请直接输出扩写后的文本。',
  shrink:
    '你是一位精炼的编辑。在保留核心情节和关键信息的前提下，将冗长的段落压缩为精炼的叙述。删除不必要的修饰和重复，使文字更加紧凑有力。请直接输出缩写后的文本。',
  feedback:
    '你是一位资深文学编辑。请从以下维度对给定文本进行专业点评：\n1. 情节结构 - 故事走向是否合理，节奏是否恰当\n2. 人物塑造 - 角色是否立体，行为是否符合人设\n3. 文笔风格 - 语言是否优美，表达是否准确\n4. 节奏把控 - 详略是否得当，张弛是否有度\n5. 对话质量 - 对白是否自然，是否体现角色个性\n6. 场景描写 - 环境描写是否生动，氛围是否到位\n\n请给出具体的改进建议，而不仅仅是泛泛而谈。',
  twist:
    '你是一位擅长制造悬念的小说家。基于当前故事走向和人物设定，提出3-5个意想不到但逻辑自洽的情节转折方向。每个转折应包含：转折点描述、对故事走向的影响、涉及的角色变化。请以编号列表形式输出。',
  pov_change:
    '你是一位叙事技巧娴熟的作家。将给定文本从当前叙事视角改写为指定的新视角，同时保持故事内容和情感基调不变。注意调整人称代词、内心独白、信息揭示等叙事元素。请直接输出改写后的文本。',
  dialogue:
    '你是一位对话写作大师。根据场景描述和参与角色的性格特征，生成自然流畅、富有张力的对话。注意：每个角色的语气和用词应体现其性格；对话应推动情节发展或揭示人物关系；适当加入潜台词和言外之意。请直接输出对话文本，使用中文引号标注。',
  outline:
    '你是一位故事架构师。根据给定的故事概要、类型和设定，生成结构化的故事大纲。大纲应包含清晰的幕结构、主要情节点和角色弧线。请以JSON格式输出，格式为：[{"id":"1","title":"...","description":"...","children":[{"id":"1.1","title":"...","description":"..."}]}]',
  style_analysis:
    '你是一位文学评论家。请分析给定文本的写作风格，从以下维度进行评估：\n- 语气基调（tone）：如严肃、幽默、忧郁、热血等\n- 叙事节奏（pacing）：如紧凑、舒缓、张弛有度等\n- 词汇水平（vocabularyLevel）：如通俗、典雅、文学性强等\n- 句式结构（sentenceStructure）：如长句为主、短句利落、长短交错等\n- 叙事视角（narrativeVoice）：如第一人称亲密、第三人称全知等\n- 修辞手法（rhetoricalDevices）：如比喻、拟人、排比等\n- 总结（summary）\n\n请严格以JSON格式输出：{"tone":"...","pacing":"...","vocabularyLevel":"...","sentenceStructure":"...","narrativeVoice":"...","rhetoricalDevices":["..."],"summary":"..."}',
  story_engine:
    '你是一位专业的小说创作者。根据提供的大纲、角色设定和世界观，生成完整的章节内容。严格遵循大纲中该章节的情节要点，保持与已有章节的风格一致性。注意人物性格的连贯性、场景描写的生动性、情节推进的合理性。请直接输出章节正文。'
}

const USER_PROMPTS: Record<AIAction, (context: PromptContext) => string> = {
  continue: (ctx) => {
    let prompt = '请续写以下内容：\n\n'
    if (ctx.previousChapters) {
      prompt += `【前文梗概】\n${ctx.previousChapters}\n\n`
    }
    if (ctx.chapterContent) {
      prompt += `【章节上下文】\n${ctx.chapterContent}\n\n`
    }
    prompt += `【当前文本】\n${ctx.text}`
    prompt += buildGenerationInstructions(ctx.generationOptions)
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
  },

  // ============ 描写生成 ============
  describe: (ctx) => {
    let prompt = '请根据以下内容生成描写：\n\n'
    if (ctx.senses && ctx.senses.length > 0) {
      prompt += `【感官维度】请侧重以下感官：${formatSenses(ctx.senses)}\n\n`
    }
    if (ctx.selectedTextContext) {
      prompt += `${ctx.selectedTextContext}\n\n`
    } else {
      if (ctx.selectedText) {
        prompt += `【选中文本】\n${ctx.selectedText}\n\n`
      }
      if (ctx.chapterContent) {
        prompt += `【场景上下文】\n${ctx.chapterContent}\n\n`
      }
    }
    prompt += `【描写对象/关键词】\n${ctx.text}`
    prompt += buildGenerationInstructions(ctx.generationOptions)
    return prompt
  },

  // ============ 头脑风暴 ============
  brainstorm: (ctx) => {
    let prompt = ''
    if (ctx.brainstormType) {
      prompt += `请围绕"${formatBrainstormType(ctx.brainstormType)}"方向进行头脑风暴。\n\n`
    } else {
      prompt += '请进行创意头脑风暴。\n\n'
    }
    if (ctx.previousChapters) {
      prompt += `【故事背景】\n${ctx.previousChapters}\n\n`
    }
    if (ctx.chapterContent) {
      prompt += `【当前章节内容】\n${ctx.chapterContent}\n\n`
    }
    prompt += `【需求描述】\n${ctx.text}`
    return prompt
  },

  // ============ 扩写 ============
  expand: (ctx) => {
    let prompt = '请将以下段落进行扩写：\n\n'
    if (ctx.selectedTextContext) {
      prompt += `${ctx.selectedTextContext}\n\n`
    } else if (ctx.chapterContent) {
      prompt += `【章节上下文】\n${ctx.chapterContent}\n\n`
    }
    prompt += `【待扩写文本】\n${ctx.text}`
    prompt += buildGenerationInstructions(ctx.generationOptions)
    return prompt
  },

  // ============ 缩写 ============
  shrink: (ctx) => {
    let prompt = '请将以下段落进行精简缩写：\n\n'
    if (ctx.selectedTextContext) {
      prompt += `${ctx.selectedTextContext}\n\n`
    }
    prompt += `【待缩写文本】\n${ctx.text}`
    prompt += buildGenerationInstructions(ctx.generationOptions)
    return prompt
  },

  // ============ 写作反馈 ============
  feedback: (ctx) => {
    let prompt = '请对以下文本进行专业写作反馈：\n\n'
    if (ctx.chapterContent && ctx.chapterContent !== ctx.text) {
      prompt += `【完整章节上下文】\n${ctx.chapterContent}\n\n`
    }
    prompt += `【待点评文本】\n${ctx.text}`
    return prompt
  },

  // ============ 情节转折 ============
  twist: (ctx) => {
    let prompt = '请基于以下故事内容，提出意想不到但逻辑自洽的情节转折方向：\n\n'
    if (ctx.previousChapters) {
      prompt += `【前文梗概】\n${ctx.previousChapters}\n\n`
    }
    if (ctx.chapterContent) {
      prompt += `【当前章节内容】\n${ctx.chapterContent}\n\n`
    }
    prompt += `【当前情节走向】\n${ctx.text}`
    return prompt
  },

  // ============ 视角切换 ============
  pov_change: (ctx) => {
    const targetPOVLabel = formatPOV(ctx.targetPOV)
    let prompt = `请将以下文本改写为${targetPOVLabel}视角：\n\n`
    if (ctx.selectedTextContext) {
      prompt += `${ctx.selectedTextContext}\n\n`
    }
    prompt += `【原文】\n${ctx.text}`
    prompt += buildGenerationInstructions(ctx.generationOptions)
    return prompt
  },

  // ============ 对话生成 ============
  dialogue: (ctx) => {
    let prompt = '请根据以下信息生成对话：\n\n'
    if (ctx.dialogueCharacterInfo) {
      prompt += `${ctx.dialogueCharacterInfo}\n\n`
    }
    if (ctx.selectedTextContext) {
      prompt += `${ctx.selectedTextContext}\n\n`
    } else if (ctx.chapterContent) {
      prompt += `【场景上下文】\n${ctx.chapterContent}\n\n`
    }
    prompt += `【场景描述/对话需求】\n${ctx.text}`
    prompt += buildGenerationInstructions(ctx.generationOptions)
    return prompt
  },

  // ============ 大纲生成 ============
  outline: (ctx) => {
    let prompt = '请根据以下信息生成结构化的故事大纲：\n\n'
    if (ctx.outlineContent) {
      prompt += `【现有大纲参考】\n${ctx.outlineContent}\n\n`
    }
    prompt += `【故事概要/需求】\n${ctx.text}`
    return prompt
  },

  // ============ 风格分析 ============
  style_analysis: (ctx) => {
    let prompt = '请分析以下文本的写作风格，严格以JSON格式输出结果：\n\n'
    prompt += `【待分析文本】\n${ctx.text}`
    return prompt
  },

  // ============ 故事引擎 ============
  story_engine: (ctx) => {
    let prompt = '请根据以下信息生成章节正文：\n\n'
    if (ctx.outlineContent) {
      prompt += `【章节大纲】\n${ctx.outlineContent}\n\n`
    }
    if (ctx.previousChapters) {
      prompt += `【前文梗概】\n${ctx.previousChapters}\n\n`
    }
    if (ctx.chapterContent) {
      prompt += `【已有内容】\n${ctx.chapterContent}\n\n`
    }
    if (ctx.styleProfile) {
      prompt += `【风格参考】\n${ctx.styleProfile}\n\n`
    }
    prompt += `【写作指示】\n${ctx.text}`
    prompt += buildGenerationInstructions(ctx.generationOptions)
    return prompt
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
