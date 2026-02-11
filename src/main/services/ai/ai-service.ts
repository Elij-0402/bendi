import { providerRegistry } from './provider-registry'
import { buildPrompt } from './prompt-templates'
import { buildContextForProject, buildOutlineContext, buildStyleContext, buildSelectedTextContext, buildDialogueCharactersContext } from './context-builder'
import type { StreamChunk } from './adapters/base-adapter'
import type { AIAdapterConfig } from './adapters/base-adapter'
import type { AIRequestPayload, AIProviderType, StyleAnalysis } from '../../../shared/types'
import { queryOne } from '../database/connection'
import { decryptKey } from '../key-manager'
import { GenerationHistoryRepository } from '../database/repositories/generation-history.repository'
import { WritingStyleRepository } from '../database/repositories/writing-style.repository'

const generationHistoryRepo = new GenerationHistoryRepository()
const writingStyleRepo = new WritingStyleRepository()

interface ProviderRow {
  id: number
  name: string
  type: AIProviderType
  base_url: string
  model: string
  api_key_encrypted: string
  is_default: number
  created_at: string
  updated_at: string
}

export class AIService {
  private abortControllers = new Map<string, AbortController>()
  private latestRequestBySource = new Map<'chat' | 'inline', string>()

  async *processRequest(payload: AIRequestPayload): AsyncGenerator<StreamChunk> {
    // 1. Get provider config from database
    const provider = queryOne(
      'SELECT * FROM ai_providers WHERE id = ?',
      [payload.providerId]
    ) as ProviderRow | null

    if (!provider) {
      yield { type: 'error', content: `Provider with id ${payload.providerId} not found` }
      return
    }

    // 2. Decrypt API key
    let apiKey: string
    try {
      apiKey = provider.api_key_encrypted ? decryptKey(provider.api_key_encrypted) : ''
    } catch {
      yield { type: 'error', content: 'Failed to decrypt API key' }
      return
    }

    // 3. Auto-fill context from project if available
    if (payload.context?.projectId) {
      const projectContext = buildContextForProject(
        payload.context.projectId,
        payload.context.chapterId
      )
      if (!payload.context.characterInfo && projectContext.characterInfo) {
        payload.context.characterInfo = projectContext.characterInfo
      }
      if (!payload.context.worldInfo && projectContext.worldInfo) {
        payload.context.worldInfo = projectContext.worldInfo
      }
      if (!payload.context.previousChapters && projectContext.previousChapters) {
        payload.context.previousChapters = projectContext.previousChapters
      }
    }

    // 3b. Build selected text surrounding context for selection-based actions
    const selectionActions = new Set(['expand', 'shrink', 'rewrite', 'describe', 'pov_change', 'dialogue', 'polish'])
    let selectedTextContext: string | undefined
    if (
      payload.selectedText &&
      payload.context?.chapterContent &&
      selectionActions.has(payload.action)
    ) {
      selectedTextContext = buildSelectedTextContext(
        payload.context.chapterContent,
        payload.selectedText
      )
    }

    // 3c. Build dialogue character context for dialogue action
    let dialogueCharacterInfo: string | undefined
    if (payload.action === 'dialogue' && payload.context?.projectId) {
      dialogueCharacterInfo = buildDialogueCharactersContext(payload.context.projectId)
    }

    // 4. Build prompt messages
    const promptMessages = buildPrompt(payload.action, {
      text: payload.text,
      chapterContent: payload.context?.chapterContent,
      characterInfo: payload.context?.characterInfo,
      worldInfo: payload.context?.worldInfo,
      previousChapters: payload.context?.previousChapters,
      generationOptions: payload.generationOptions,
      brainstormType: payload.brainstormType,
      senses: payload.senses,
      targetPOV: payload.targetPOV,
      selectedText: payload.selectedText,
      outlineContent: payload.outlineId
        ? buildOutlineContext(payload.context?.projectId ?? 0, payload.outlineId)
        : undefined,
      styleProfile: payload.styleProfileId
        ? buildStyleContext(payload.styleProfileId)
        : undefined,
      selectedTextContext,
      dialogueCharacterInfo
    })

    // If there is conversation history, prepend system message and append history + new user message
    let messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>

    if (payload.conversationHistory && payload.conversationHistory.length > 0) {
      const systemMsg = promptMessages.find((m) => m.role === 'system')
      messages = []
      if (systemMsg) {
        messages.push(systemMsg)
      }
      for (const msg of payload.conversationHistory) {
        messages.push({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        })
      }
      const userMsg = promptMessages.find((m) => m.role === 'user')
      if (userMsg) {
        messages.push(userMsg)
      }
    } else {
      messages = promptMessages
    }

    // 5. Get the appropriate adapter
    const adapter = providerRegistry.getAdapter(provider.type)

    // 5. Build adapter config
    const adapterConfig: AIAdapterConfig = {
      baseUrl: provider.base_url,
      apiKey: apiKey,
      model: provider.model,
      temperature: payload.generationOptions?.temperature
    }

    // 6. Set up abort controller
    const requestId = payload.requestId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const source = payload.source ?? 'chat'
    const abortController = new AbortController()
    this.abortControllers.set(requestId, abortController)
    this.latestRequestBySource.set(source, requestId)

    // 7. Call adapter, yield chunks, and collect full output
    let fullOutput = ''
    try {
      for await (const chunk of adapter.chat(messages, adapterConfig)) {
        const isLatestForSource = this.latestRequestBySource.get(source) === requestId
        if (abortController.signal.aborted || !isLatestForSource) {
          yield { type: 'done', content: '', requestId, source }
          return
        }
        if (chunk.type === 'text') {
          fullOutput += chunk.content
        }
        yield { ...chunk, requestId, source }
      }

      // 8. Post-processing based on action type
      this.postProcess(payload, fullOutput)
    } catch (error) {
      if (abortController.signal.aborted) {
        yield { type: 'done', content: '', requestId, source }
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error'
        yield { type: 'error', content: message, requestId, source }
      }
    } finally {
      this.abortControllers.delete(requestId)
      if (this.latestRequestBySource.get(source) === requestId) {
        this.latestRequestBySource.delete(source)
      }
    }
  }

  /**
   * Post-process after generation completes:
   * - Save to generation history
   * - For style_analysis: parse JSON and save to writing_style_profiles
   */
  private postProcess(payload: AIRequestPayload, fullOutput: string): void {
    if (!fullOutput) return

    // Save generation history (skip chat action to avoid cluttering history)
    if (payload.action !== 'chat' && payload.context?.projectId) {
      try {
        generationHistoryRepo.create({
          projectId: payload.context.projectId,
          chapterId: payload.context.chapterId,
          action: payload.action,
          inputText: payload.text,
          outputText: fullOutput,
          options: payload.generationOptions
        })
      } catch {
        // Silently ignore history save failures
      }
    }

    // For style_analysis: parse result and save to database
    if (payload.action === 'style_analysis' && payload.styleProfileId) {
      try {
        const analysis = this.parseStyleAnalysis(fullOutput)
        if (analysis) {
          writingStyleRepo.update(payload.styleProfileId, { analysis })
        }
      } catch {
        // Silently ignore parse failures
      }
    }
  }

  private parseStyleAnalysis(output: string): StyleAnalysis | null {
    // Extract JSON from the output (may be wrapped in markdown code blocks)
    let jsonStr = output.trim()
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }
    // Try to find JSON object boundaries
    const startIdx = jsonStr.indexOf('{')
    const endIdx = jsonStr.lastIndexOf('}')
    if (startIdx === -1 || endIdx === -1) return null
    jsonStr = jsonStr.slice(startIdx, endIdx + 1)

    try {
      const parsed = JSON.parse(jsonStr)
      // Validate required fields
      if (parsed.tone && parsed.pacing && parsed.vocabularyLevel) {
        return {
          tone: parsed.tone,
          pacing: parsed.pacing,
          vocabularyLevel: parsed.vocabularyLevel,
          sentenceStructure: parsed.sentenceStructure || '',
          narrativeVoice: parsed.narrativeVoice || '',
          rhetoricalDevices: Array.isArray(parsed.rhetoricalDevices) ? parsed.rhetoricalDevices : [],
          summary: parsed.summary || ''
        }
      }
    } catch {
      // Invalid JSON
    }
    return null
  }

  cancel(source?: 'chat' | 'inline'): void {
    if (!source) {
      for (const controller of this.abortControllers.values()) {
        controller.abort()
      }
      this.abortControllers.clear()
      this.latestRequestBySource.clear()
      return
    }

    const requestId = this.latestRequestBySource.get(source)
    if (!requestId) return

    const controller = this.abortControllers.get(requestId)
    controller?.abort()
    this.abortControllers.delete(requestId)
    this.latestRequestBySource.delete(source)
  }
}

export const aiService = new AIService()
