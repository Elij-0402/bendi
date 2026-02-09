export interface AIAdapterConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface StreamChunk {
  type: 'text' | 'error' | 'done'
  content: string
}

export interface AIAdapter {
  chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config: AIAdapterConfig
  ): AsyncGenerator<StreamChunk>
}
