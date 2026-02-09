import OpenAI from 'openai'
import type { AIAdapter, AIAdapterConfig, StreamChunk } from './base-adapter'

export class OpenAIAdapter implements AIAdapter {
  async *chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config: AIAdapterConfig
  ): AsyncGenerator<StreamChunk> {
    try {
      const client = new OpenAI({
        baseURL: config.baseUrl,
        apiKey: config.apiKey
      })

      const stream = await client.chat.completions.create({
        model: config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content
        })),
        stream: true
      })

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) {
          yield { type: 'text', content: delta }
        }
      }

      yield { type: 'done', content: '' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI request failed'
      yield { type: 'error', content: message }
    }
  }
}
