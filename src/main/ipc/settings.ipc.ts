import { ipcMain, app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { IPC_CHANNELS } from '../../shared/types'
import type {
  AIProviderType,
  CreateAIProviderInput,
  UpdateAIProviderInput
} from '../../shared/types'
import { queryAll, queryOne, run, getLastInsertRowId, saveDatabase } from '../services/database/connection'
import { encryptKey, decryptKey } from '../services/key-manager'
import { providerRegistry } from '../services/ai/provider-registry'

// Simple JSON-based settings store (replaces electron-store which requires ESM)
class SimpleStore {
  private data: Record<string, unknown> = {}
  private filePath: string

  constructor() {
    this.filePath = join(app.getPath('userData'), 'settings.json')
    if (existsSync(this.filePath)) {
      try {
        this.data = JSON.parse(readFileSync(this.filePath, 'utf-8'))
      } catch {
        this.data = {}
      }
    }
  }

  get(key: string): unknown {
    return this.data[key]
  }

  set(key: string, value: unknown): void {
    this.data[key] = value
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
  }
}

const store = new SimpleStore()

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

function rowToProvider(row: ProviderRow) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    baseUrl: row.base_url,
    model: row.model,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function registerSettingsIPC(): void {
  // ============ Settings ============

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_event, key: string) => {
    return store.get(key)
  })

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET,
    async (_event, key: string, value: unknown) => {
      store.set(key, value)
    }
  )

  // ============ AI Provider CRUD ============

  // List all providers
  ipcMain.handle(IPC_CHANNELS.AI_PROVIDER_LIST, async () => {
    const rows = queryAll('SELECT * FROM ai_providers ORDER BY created_at DESC') as ProviderRow[]
    return rows.map(rowToProvider)
  })

  // Get a single provider
  ipcMain.handle(IPC_CHANNELS.AI_PROVIDER_GET, async (_event, id: number) => {
    const row = queryOne('SELECT * FROM ai_providers WHERE id = ?', [id]) as ProviderRow | null
    return row ? rowToProvider(row) : null
  })

  // Create a provider
  ipcMain.handle(
    IPC_CHANNELS.AI_PROVIDER_CREATE,
    async (_event, input: CreateAIProviderInput) => {
      const encryptedKey = encryptKey(input.apiKey)
      const now = new Date().toISOString()

      // If this provider is set as default, clear other defaults
      if (input.isDefault) {
        run('UPDATE ai_providers SET is_default = 0')
      }

      run(
        `INSERT INTO ai_providers (name, type, base_url, api_key_encrypted, model, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.name,
          input.type,
          input.baseUrl,
          encryptedKey,
          input.model,
          input.isDefault ? 1 : 0,
          now,
          now
        ]
      )

      const id = getLastInsertRowId()
      saveDatabase()
      const row = queryOne('SELECT * FROM ai_providers WHERE id = ?', [id]) as ProviderRow
      return rowToProvider(row)
    }
  )

  // Update a provider
  ipcMain.handle(
    IPC_CHANNELS.AI_PROVIDER_UPDATE,
    async (_event, input: UpdateAIProviderInput) => {
      const now = new Date().toISOString()

      // Get existing provider
      const existing = queryOne(
        'SELECT * FROM ai_providers WHERE id = ?',
        [input.id]
      ) as ProviderRow | null

      if (!existing) {
        throw new Error(`Provider with id ${input.id} not found`)
      }

      // If setting as default, clear other defaults
      if (input.isDefault) {
        run('UPDATE ai_providers SET is_default = 0')
      }

      // Build update fields
      const name = input.name ?? existing.name
      const type = input.type ?? existing.type
      const baseUrl = input.baseUrl ?? existing.base_url
      const model = input.model ?? existing.model
      const isDefault =
        input.isDefault !== undefined
          ? input.isDefault
            ? 1
            : 0
          : existing.is_default
      const encryptedKey = input.apiKey
        ? encryptKey(input.apiKey)
        : existing.api_key_encrypted

      run(
        `UPDATE ai_providers
         SET name = ?, type = ?, base_url = ?, api_key_encrypted = ?, model = ?, is_default = ?, updated_at = ?
         WHERE id = ?`,
        [name, type, baseUrl, encryptedKey, model, isDefault, now, input.id]
      )

      saveDatabase()
      const row = queryOne('SELECT * FROM ai_providers WHERE id = ?', [input.id]) as ProviderRow
      return rowToProvider(row)
    }
  )

  // Delete a provider
  ipcMain.handle(IPC_CHANNELS.AI_PROVIDER_DELETE, async (_event, id: number) => {
    run('DELETE FROM ai_providers WHERE id = ?', [id])
    saveDatabase()
  })

  // Test a provider connection
  ipcMain.handle(IPC_CHANNELS.AI_PROVIDER_TEST, async (_event, id: number) => {
    const row = queryOne(
      'SELECT * FROM ai_providers WHERE id = ?',
      [id]
    ) as ProviderRow | null

    if (!row) {
      return { success: false, message: `Provider with id ${id} not found` }
    }

    let apiKey: string
    try {
      apiKey = decryptKey(row.api_key_encrypted)
    } catch {
      return { success: false, message: 'Failed to decrypt API key' }
    }

    try {
      const adapter = providerRegistry.getAdapter(row.type)
      const testMessages: Array<{
        role: 'system' | 'user' | 'assistant'
        content: string
      }> = [{ role: 'user', content: 'Hi, this is a connection test. Reply with "OK".' }]

      let receivedText = false
      for await (const chunk of adapter.chat(testMessages, {
        baseUrl: row.base_url,
        apiKey: apiKey,
        model: row.model
      })) {
        if (chunk.type === 'error') {
          return { success: false, message: chunk.content }
        }
        if (chunk.type === 'text') {
          receivedText = true
          // We got a response, connection is working - break early
          break
        }
      }

      if (receivedText) {
        return { success: true, message: 'Connection successful' }
      }

      return { success: false, message: 'No response received from provider' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed'
      return { success: false, message }
    }
  })
}
