import { providerRegistry } from './provider-registry'
import { buildPrompt } from './prompt-templates'
import type { StreamChunk } from './adapters/base-adapter'
import type { AIAdapterConfig } from './adapters/base-adapter'
import type { AIRequestPayload, AIProviderType } from '../../../shared/types'
import { queryOne } from '../database/connection'
import { decryptKey } from '../key-manager'

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
  private currentAbortController: AbortController | null = null

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
      apiKey = decryptKey(provider.api_key_encrypted)
    } catch {
      yield { type: 'error', content: 'Failed to decrypt API key' }
      return
    }

    // 3. Build prompt messages
    const promptMessages = buildPrompt(payload.action, {
      text: payload.text,
      chapterContent: payload.context?.chapterContent,
      characterInfo: payload.context?.characterInfo,
      worldInfo: payload.context?.worldInfo
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
      // Add current user message from prompt
      const userMsg = promptMessages.find((m) => m.role === 'user')
      if (userMsg) {
        messages.push(userMsg)
      }
    } else {
      messages = promptMessages
    }

    // 4. Get the appropriate adapter
    const adapter = providerRegistry.getAdapter(provider.type)

    // 5. Build adapter config
    const adapterConfig: AIAdapterConfig = {
      baseUrl: provider.base_url,
      apiKey: apiKey,
      model: provider.model
    }

    // 6. Set up abort controller
    this.currentAbortController = new AbortController()

    // 7. Call adapter and yield chunks
    try {
      for await (const chunk of adapter.chat(messages, adapterConfig)) {
        if (this.currentAbortController?.signal.aborted) {
          yield { type: 'done', content: '' }
          return
        }
        yield chunk
      }
    } catch (error) {
      if (this.currentAbortController?.signal.aborted) {
        yield { type: 'done', content: '' }
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error'
        yield { type: 'error', content: message }
      }
    } finally {
      this.currentAbortController = null
    }
  }

  cancel(): void {
    this.currentAbortController?.abort()
    this.currentAbortController = null
  }
}

export const aiService = new AIService()
