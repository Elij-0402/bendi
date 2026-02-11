import type { Outline, CreateOutlineInput, UpdateOutlineInput } from '../../../../shared/types'
import { queryAll, queryOne, run, getLastInsertRowId, saveDatabase } from '../connection'

interface OutlineRow {
  id: number
  project_id: number
  type: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

function mapRowToOutline(row: OutlineRow): Outline {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type as Outline['type'],
    title: row.title,
    content: JSON.parse(row.content || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class OutlineRepository {
  listByProject(projectId: number): Outline[] {
    const rows = queryAll(
      'SELECT * FROM outlines WHERE project_id = ? ORDER BY updated_at DESC',
      [projectId]
    ) as OutlineRow[]
    return rows.map(mapRowToOutline)
  }

  getById(id: number): Outline | null {
    const row = queryOne('SELECT * FROM outlines WHERE id = ?', [id]) as OutlineRow | null
    return row ? mapRowToOutline(row) : null
  }

  create(input: CreateOutlineInput): Outline {
    run(
      `INSERT INTO outlines (project_id, type, title, content)
       VALUES (?, ?, ?, ?)`,
      [
        input.projectId,
        input.type,
        input.title,
        JSON.stringify(input.content)
      ]
    )

    const id = getLastInsertRowId()
    saveDatabase()
    return this.getById(id)!
  }

  update(id: number, input: UpdateOutlineInput): Outline | null {
    const existing = this.getById(id)
    if (!existing) {
      return null
    }

    run(
      `UPDATE outlines
       SET title = ?,
           content = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.title ?? existing.title,
        input.content !== undefined ? JSON.stringify(input.content) : JSON.stringify(existing.content),
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
    run('DELETE FROM outlines WHERE id = ?', [id])
    saveDatabase()
    return true
  }
}
