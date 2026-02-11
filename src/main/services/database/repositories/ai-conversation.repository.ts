import type { AIConversation, AIMessage } from '../../../../shared/types'
import { queryAll, queryOne, run, getLastInsertRowId, saveDatabase } from '../connection'

interface ConversationRow {
  id: number
  project_id: number
  chapter_id: number | null
  title: string
  created_at: string
}

interface MessageRow {
  id: number
  conversation_id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

function mapConversation(row: ConversationRow): AIConversation {
  return {
    id: row.id,
    projectId: row.project_id,
    chapterId: row.chapter_id ?? undefined,
    title: row.title,
    createdAt: row.created_at
  }
}

function mapMessage(row: MessageRow): AIMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at
  }
}

export class AIConversationRepository {
  findLatest(projectId: number, chapterId?: number): AIConversation | null {
    const params: Array<number | null> = [projectId]
    let sql = 'SELECT * FROM ai_conversations WHERE project_id = ?'

    if (chapterId === undefined) {
      sql += ' AND chapter_id IS NULL'
    } else {
      sql += ' AND chapter_id = ?'
      params.push(chapterId)
    }

    sql += ' ORDER BY id DESC LIMIT 1'
    const row = queryOne(sql, params) as ConversationRow | null
    return row ? mapConversation(row) : null
  }

  create(projectId: number, chapterId?: number, title = 'AI 对话'): AIConversation {
    run('INSERT INTO ai_conversations (project_id, chapter_id, title) VALUES (?, ?, ?)', [
      projectId,
      chapterId ?? null,
      title
    ])
    const id = getLastInsertRowId()
    saveDatabase()
    return this.findById(id)!
  }

  findById(id: number): AIConversation | null {
    const row = queryOne('SELECT * FROM ai_conversations WHERE id = ?', [id]) as ConversationRow | null
    return row ? mapConversation(row) : null
  }

  getOrCreate(projectId: number, chapterId?: number): AIConversation {
    const existing = this.findLatest(projectId, chapterId)
    if (existing) return existing
    return this.create(projectId, chapterId)
  }

  listMessages(conversationId: number): AIMessage[] {
    const rows = queryAll(
      'SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY id ASC',
      [conversationId]
    ) as MessageRow[]
    return rows.map(mapMessage)
  }

  addMessage(conversationId: number, role: 'user' | 'assistant' | 'system', content: string): AIMessage {
    run('INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, ?, ?)', [
      conversationId,
      role,
      content
    ])
    const id = getLastInsertRowId()
    saveDatabase()
    const row = queryOne('SELECT * FROM ai_messages WHERE id = ?', [id]) as MessageRow
    return mapMessage(row)
  }

  clearByProject(projectId: number, chapterId?: number): void {
    const params: Array<number | null> = [projectId]
    let sql = 'DELETE FROM ai_conversations WHERE project_id = ?'

    if (chapterId === undefined) {
      sql += ' AND chapter_id IS NULL'
    } else {
      sql += ' AND chapter_id = ?'
      params.push(chapterId)
    }

    run(sql, params)
    saveDatabase()
  }
}
