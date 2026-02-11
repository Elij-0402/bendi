import type { GenerationHistory } from '../../../../shared/types'
import { queryAll, queryOne, run, getLastInsertRowId, saveDatabase } from '../connection'

interface GenerationHistoryRow {
  id: number
  project_id: number
  chapter_id: number | null
  action: string
  input_text: string
  output_text: string
  options: string | null
  accepted: number
  created_at: string
}

function mapRowToGenerationHistory(row: GenerationHistoryRow): GenerationHistory {
  return {
    id: row.id,
    projectId: row.project_id,
    chapterId: row.chapter_id,
    action: row.action as GenerationHistory['action'],
    inputText: row.input_text,
    outputText: row.output_text,
    options: row.options ? JSON.parse(row.options) : null,
    accepted: row.accepted === 1,
    createdAt: row.created_at
  }
}

interface CreateGenerationHistoryInput {
  projectId: number
  chapterId?: number
  action: string
  inputText: string
  outputText: string
  options?: any
  accepted?: boolean
}

export class GenerationHistoryRepository {
  listByProject(
    projectId: number,
    options?: { action?: string; chapterId?: number; limit?: number }
  ): GenerationHistory[] {
    let sql = 'SELECT * FROM generation_history WHERE project_id = ?'
    const params: any[] = [projectId]

    if (options?.action) {
      sql += ' AND action = ?'
      params.push(options.action)
    }
    if (options?.chapterId !== undefined) {
      sql += ' AND chapter_id = ?'
      params.push(options.chapterId)
    }

    sql += ' ORDER BY created_at DESC'

    if (options?.limit) {
      sql += ' LIMIT ?'
      params.push(options.limit)
    }

    const rows = queryAll(sql, params) as GenerationHistoryRow[]
    return rows.map(mapRowToGenerationHistory)
  }

  getById(id: number): GenerationHistory | null {
    const row = queryOne('SELECT * FROM generation_history WHERE id = ?', [id]) as GenerationHistoryRow | null
    return row ? mapRowToGenerationHistory(row) : null
  }

  create(input: CreateGenerationHistoryInput): GenerationHistory {
    run(
      `INSERT INTO generation_history (project_id, chapter_id, action, input_text, output_text, options, accepted)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.projectId,
        input.chapterId ?? null,
        input.action,
        input.inputText,
        input.outputText,
        input.options ? JSON.stringify(input.options) : null,
        input.accepted ? 1 : 0
      ]
    )

    const id = getLastInsertRowId()
    saveDatabase()
    return this.getById(id)!
  }

  markAccepted(id: number): boolean {
    const existing = this.getById(id)
    if (!existing) {
      return false
    }
    run('UPDATE generation_history SET accepted = 1 WHERE id = ?', [id])
    saveDatabase()
    return true
  }

  remove(id: number): boolean {
    const existing = this.getById(id)
    if (!existing) {
      return false
    }
    run('DELETE FROM generation_history WHERE id = ?', [id])
    saveDatabase()
    return true
  }

  clearByProject(projectId: number): boolean {
    run('DELETE FROM generation_history WHERE project_id = ?', [projectId])
    saveDatabase()
    return true
  }
}
