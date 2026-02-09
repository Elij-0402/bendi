import type { AIAdapter } from './adapters/base-adapter'
import { OpenAIAdapter } from './adapters/openai.adapter'
import { AnthropicAdapter } from './adapters/anthropic.adapter'
import type { AIProviderType } from '../../../shared/types'

class ProviderRegistry {
  private adapters: Map<AIProviderType, AIAdapter> = new Map()

  constructor() {
    this.adapters.set('openai', new OpenAIAdapter())
    this.adapters.set('anthropic', new AnthropicAdapter())
  }

  getAdapter(type: AIProviderType): AIAdapter {
    const adapter = this.adapters.get(type)
    if (!adapter) {
      throw new Error(`Unknown provider type: ${type}`)
    }
    return adapter
  }
}

export const providerRegistry = new ProviderRegistry()
