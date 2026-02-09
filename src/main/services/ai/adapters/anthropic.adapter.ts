import Anthropic from '@anthropic-ai/sdk'
import type { AIAdapter, AIAdapterConfig, StreamChunk } from './base-adapter'

export class AnthropicAdapter implements AIAdapter {
  async *chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config: AIAdapterConfig
  ): AsyncGenerator<StreamChunk> {
    try {
      const clientOptions: ConstructorParameters<typeof Anthropic>[0] = {
        apiKey: config.apiKey
      }
      if (config.baseUrl) {
        clientOptions.baseURL = config.baseUrl
      }

      const client = new Anthropic(clientOptions)

      // Extract system messages and separate them from conversation messages
      const systemMessages = messages.filter((m) => m.role === 'system')
      const conversationMessages = messages.filter((m) => m.role !== 'system')

      const systemPrompt =
        systemMessages.length > 0
          ? systemMessages.map((m) => m.content).join('\n\n')
          : undefined

      const stream = client.messages.stream({
        model: config.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: conversationMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
      })

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield { type: 'text', content: event.delta.text }
        }
      }

      yield { type: 'done', content: '' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Anthropic request failed'
      yield { type: 'error', content: message }
    }
  }
}
