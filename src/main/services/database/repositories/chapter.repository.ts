import type { Chapter, CreateChapterInput, UpdateChapterInput } from '../../../../shared/types'
import { getDb, queryAll, queryOne, run, getLastInsertRowId, saveDatabase } from '../connection'

interface ChapterRow {
  id: number
  project_id: number
  title: string
  content: string
  sort_order: number
  word_count: number
  status: string
  created_at: string
  updated_at: string
}

function mapRowToChapter(row: ChapterRow): Chapter {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    content: row.content,
    sortOrder: row.sort_order,
    wordCount: row.word_count,
    status: row.status as Chapter['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class ChapterRepository {
  findByProjectId(projectId: number): Chapter[] {
    const rows = queryAll(
      'SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order ASC',
      [projectId]
    ) as ChapterRow[]
    return rows.map(mapRowToChapter)
  }

  findById(id: number): Chapter | null {
    const row = queryOne('SELECT * FROM chapters WHERE id = ?', [id]) as ChapterRow | null
    return row ? mapRowToChapter(row) : null
  }

  create(input: CreateChapterInput): Chapter {
    // Calculate sortOrder: max existing + 1
    let sortOrder = input.sortOrder
    if (sortOrder === undefined) {
      const maxRow = queryOne(
        'SELECT MAX(sort_order) as max_order FROM chapters WHERE project_id = ?',
        [input.projectId]
      ) as { max_order: number | null } | null
      sortOrder = (maxRow?.max_order ?? -1) + 1
    }

    run(
      `INSERT INTO chapters (project_id, title, content, sort_order)
       VALUES (?, ?, ?, ?)`,
      [input.projectId, input.title, input.content ?? '', sortOrder]
    )

    const id = getLastInsertRowId()
    saveDatabase()
    return this.findById(id)!
  }

  update(input: UpdateChapterInput): Chapter {
    const existing = this.findById(input.id)
    if (!existing) {
      throw new Error(`Chapter with id ${input.id} not found`)
    }

    run(
      `UPDATE chapters
       SET title = ?,
           content = ?,
           sort_order = ?,
           word_count = ?,
           status = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.title ?? existing.title,
        input.content ?? existing.content,
        input.sortOrder ?? existing.sortOrder,
        input.wordCount ?? existing.wordCount,
        input.status ?? existing.status,
        input.id
      ]
    )

    // If word_count changed, update the project's current_word_count
    if (input.wordCount !== undefined) {
      const chapter = this.findById(input.id)!
      const totalRow = queryOne(
        'SELECT SUM(word_count) as total FROM chapters WHERE project_id = ?',
        [chapter.projectId]
      ) as { total: number | null } | null
      const total = totalRow?.total ?? 0
      run(
        "UPDATE projects SET current_word_count = ?, updated_at = datetime('now') WHERE id = ?",
        [total, chapter.projectId]
      )
    }

    saveDatabase()
    return this.findById(input.id)!
  }

  delete(id: number): void {
    const chapter = this.findById(id)
    run('DELETE FROM chapters WHERE id = ?', [id])

    // Update project's current_word_count after deletion
    if (chapter) {
      const totalRow = queryOne(
        'SELECT SUM(word_count) as total FROM chapters WHERE project_id = ?',
        [chapter.projectId]
      ) as { total: number | null } | null
      const total = totalRow?.total ?? 0
      run(
        "UPDATE projects SET current_word_count = ?, updated_at = datetime('now') WHERE id = ?",
        [total, chapter.projectId]
      )
    }

    saveDatabase()
  }

  reorder(projectId: number, chapterIds: number[]): void {
    const db = getDb()
    db.run('BEGIN')
    try {
      for (let i = 0; i < chapterIds.length; i++) {
        run(
          "UPDATE chapters SET sort_order = ?, updated_at = datetime('now') WHERE id = ? AND project_id = ?",
          [i, chapterIds[i], projectId]
        )
      }
      db.run('COMMIT')
    } catch (e) {
      db.run('ROLLBACK')
      throw e
    }
    saveDatabase()
  }
}
