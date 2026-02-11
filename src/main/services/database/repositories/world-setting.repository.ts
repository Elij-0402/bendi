import type { WorldSetting, CreateWorldSettingInput, UpdateWorldSettingInput } from '../../../../shared/types'
import { queryAll, queryOne, run, getLastInsertRowId, saveDatabase } from '../connection'

interface WorldSettingRow {
  id: number
  project_id: number
  category: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

function mapRowToWorldSetting(row: WorldSettingRow): WorldSetting {
  return {
    id: row.id,
    projectId: row.project_id,
    category: row.category as WorldSetting['category'],
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class WorldSettingRepository {
  findByProjectId(projectId: number): WorldSetting[] {
    const rows = queryAll(
      'SELECT * FROM world_settings WHERE project_id = ? ORDER BY category ASC, title ASC',
      [projectId]
    ) as WorldSettingRow[]
    return rows.map(mapRowToWorldSetting)
  }

  findById(id: number): WorldSetting | null {
    const row = queryOne('SELECT * FROM world_settings WHERE id = ?', [id]) as WorldSettingRow | null
    return row ? mapRowToWorldSetting(row) : null
  }

  create(input: CreateWorldSettingInput): WorldSetting {
    run(
      `INSERT INTO world_settings (project_id, category, title, content)
       VALUES (?, ?, ?, ?)`,
      [input.projectId, input.category, input.title, input.content ?? '']
    )

    const id = getLastInsertRowId()
    saveDatabase()
    return this.findById(id)!
  }

  update(input: UpdateWorldSettingInput): WorldSetting {
    const existing = this.findById(input.id)
    if (!existing) {
      throw new Error(`WorldSetting with id ${input.id} not found`)
    }

    run(
      `UPDATE world_settings
       SET category = ?,
           title = ?,
           content = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.category ?? existing.category,
        input.title ?? existing.title,
        input.content ?? existing.content,
        input.id
      ]
    )

    saveDatabase()
    return this.findById(input.id)!
  }

  delete(id: number): void {
    run('DELETE FROM world_settings WHERE id = ?', [id])
    saveDatabase()
  }
}
