import type { Project, CreateProjectInput, UpdateProjectInput } from '../../../../shared/types'
import { queryAll, queryOne, run, getLastInsertRowId, saveDatabase } from '../connection'

interface ProjectRow {
  id: number
  title: string
  description: string
  genre: string
  target_word_count: number
  current_word_count: number
  created_at: string
  updated_at: string
}

function mapRowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    genre: row.genre,
    targetWordCount: row.target_word_count,
    currentWordCount: row.current_word_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class ProjectRepository {
  findAll(): Project[] {
    const rows = queryAll('SELECT * FROM projects ORDER BY updated_at DESC') as ProjectRow[]
    return rows.map(mapRowToProject)
  }

  findById(id: number): Project | null {
    const row = queryOne('SELECT * FROM projects WHERE id = ?', [id]) as ProjectRow | null
    return row ? mapRowToProject(row) : null
  }

  create(input: CreateProjectInput): Project {
    run(
      `INSERT INTO projects (title, description, genre, target_word_count)
       VALUES (?, ?, ?, ?)`,
      [
        input.title,
        input.description ?? '',
        input.genre ?? '',
        input.targetWordCount ?? 0
      ]
    )

    const id = getLastInsertRowId()
    saveDatabase()
    return this.findById(id)!
  }

  update(input: UpdateProjectInput): Project {
    const existing = this.findById(input.id)
    if (!existing) {
      throw new Error(`Project with id ${input.id} not found`)
    }

    run(
      `UPDATE projects
       SET title = ?,
           description = ?,
           genre = ?,
           target_word_count = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.title ?? existing.title,
        input.description ?? existing.description,
        input.genre ?? existing.genre,
        input.targetWordCount ?? existing.targetWordCount,
        input.id
      ]
    )

    saveDatabase()
    return this.findById(input.id)!
  }

  delete(id: number): void {
    run('DELETE FROM projects WHERE id = ?', [id])
    saveDatabase()
  }
}
