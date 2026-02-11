import type { StoryNote, CreateStoryNoteInput, UpdateStoryNoteInput } from '../../../../shared/types'
import { queryAll, queryOne, run, getLastInsertRowId, saveDatabase } from '../connection'

interface StoryNoteRow {
  id: number
  project_id: number
  category: string
  title: string
  content: string
  tags: string
  created_at: string
  updated_at: string
}

function mapRowToStoryNote(row: StoryNoteRow): StoryNote {
  return {
    id: row.id,
    projectId: row.project_id,
    category: row.category as StoryNote['category'],
    title: row.title,
    content: row.content,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class StoryNoteRepository {
  listByProject(projectId: number, category?: string): StoryNote[] {
    if (category) {
      const rows = queryAll(
        'SELECT * FROM story_notes WHERE project_id = ? AND category = ? ORDER BY updated_at DESC',
        [projectId, category]
      ) as StoryNoteRow[]
      return rows.map(mapRowToStoryNote)
    }
    const rows = queryAll(
      'SELECT * FROM story_notes WHERE project_id = ? ORDER BY updated_at DESC',
      [projectId]
    ) as StoryNoteRow[]
    return rows.map(mapRowToStoryNote)
  }

  getById(id: number): StoryNote | null {
    const row = queryOne('SELECT * FROM story_notes WHERE id = ?', [id]) as StoryNoteRow | null
    return row ? mapRowToStoryNote(row) : null
  }

  create(input: CreateStoryNoteInput): StoryNote {
    run(
      `INSERT INTO story_notes (project_id, category, title, content, tags)
       VALUES (?, ?, ?, ?, ?)`,
      [
        input.projectId,
        input.category,
        input.title,
        input.content,
        JSON.stringify(input.tags ?? [])
      ]
    )

    const id = getLastInsertRowId()
    saveDatabase()
    return this.getById(id)!
  }

  update(id: number, input: UpdateStoryNoteInput): StoryNote | null {
    const existing = this.getById(id)
    if (!existing) {
      return null
    }

    run(
      `UPDATE story_notes
       SET category = ?,
           title = ?,
           content = ?,
           tags = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.category ?? existing.category,
        input.title ?? existing.title,
        input.content ?? existing.content,
        input.tags !== undefined ? JSON.stringify(input.tags) : JSON.stringify(existing.tags),
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
    run('DELETE FROM story_notes WHERE id = ?', [id])
    saveDatabase()
    return true
  }
}
