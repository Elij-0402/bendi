import type { WritingStyleProfile, CreateWritingStyleInput, UpdateWritingStyleInput } from '../../../../shared/types'
import { queryAll, queryOne, run, getLastInsertRowId, saveDatabase } from '../connection'

interface WritingStyleRow {
  id: number
  project_id: number | null
  name: string
  sample_text: string
  analysis: string | null
  created_at: string
  updated_at: string
}

function mapRowToWritingStyle(row: WritingStyleRow): WritingStyleProfile {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    sampleText: row.sample_text,
    analysis: row.analysis ? JSON.parse(row.analysis) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class WritingStyleRepository {
  listByProject(projectId: number | null): WritingStyleProfile[] {
    if (projectId === null) {
      const rows = queryAll(
        'SELECT * FROM writing_style_profiles WHERE project_id IS NULL ORDER BY updated_at DESC'
      ) as WritingStyleRow[]
      return rows.map(mapRowToWritingStyle)
    }
    const rows = queryAll(
      'SELECT * FROM writing_style_profiles WHERE project_id = ? OR project_id IS NULL ORDER BY updated_at DESC',
      [projectId]
    ) as WritingStyleRow[]
    return rows.map(mapRowToWritingStyle)
  }

  getById(id: number): WritingStyleProfile | null {
    const row = queryOne('SELECT * FROM writing_style_profiles WHERE id = ?', [id]) as WritingStyleRow | null
    return row ? mapRowToWritingStyle(row) : null
  }

  create(input: CreateWritingStyleInput): WritingStyleProfile {
    run(
      `INSERT INTO writing_style_profiles (project_id, name, sample_text)
       VALUES (?, ?, ?)`,
      [
        input.projectId ?? null,
        input.name,
        input.sampleText
      ]
    )

    const id = getLastInsertRowId()
    saveDatabase()
    return this.getById(id)!
  }

  update(id: number, input: UpdateWritingStyleInput): WritingStyleProfile | null {
    const existing = this.getById(id)
    if (!existing) {
      return null
    }

    run(
      `UPDATE writing_style_profiles
       SET name = ?,
           sample_text = ?,
           analysis = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.name ?? existing.name,
        input.sampleText ?? existing.sampleText,
        input.analysis !== undefined
          ? (input.analysis === null ? null : JSON.stringify(input.analysis))
          : (existing.analysis ? JSON.stringify(existing.analysis) : null),
        id
      ]
    )

    saveDatabase()
    return this.getById(id)
  }

  remove(id: number): boolean {
    const existing = this.getById(id)
    if (!existing) {
      return false
    }
    run('DELETE FROM writing_style_profiles WHERE id = ?', [id])
    saveDatabase()
    return true
  }
}
