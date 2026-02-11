export interface AIAdapterConfig {
  baseUrl: string
  apiKey: string
  model: string
  temperature?: number
}

export interface StreamChunk {
  type: 'text' | 'error' | 'done'
  content: string
  source?: 'chat' | 'inline'
  requestId?: string
  conversationId?: number
}

export interface AIAdapter {
  chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config: AIAdapterConfig
  ): AsyncGenerator<StreamChunk>
}
