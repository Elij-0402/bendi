import type { Character, CreateCharacterInput, UpdateCharacterInput } from '../../../../shared/types'
import { queryAll, queryOne, run, getLastInsertRowId, saveDatabase } from '../connection'

interface CharacterRow {
  id: number
  project_id: number
  name: string
  aliases: string
  role: string
  appearance: string
  personality: string
  background: string
  custom_attributes: string
  created_at: string
  updated_at: string
}

function mapRowToCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    aliases: row.aliases,
    role: row.role as Character['role'],
    appearance: row.appearance,
    personality: row.personality,
    background: row.background,
    customAttributes: row.custom_attributes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class CharacterRepository {
  findByProjectId(projectId: number): Character[] {
    const rows = queryAll(
      'SELECT * FROM characters WHERE project_id = ? ORDER BY role ASC, name ASC',
      [projectId]
    ) as CharacterRow[]
    return rows.map(mapRowToCharacter)
  }

  findById(id: number): Character | null {
    const row = queryOne('SELECT * FROM characters WHERE id = ?', [id]) as CharacterRow | null
    return row ? mapRowToCharacter(row) : null
  }

  create(input: CreateCharacterInput): Character {
    run(
      `INSERT INTO characters (project_id, name, aliases, role, appearance, personality, background, custom_attributes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.projectId,
        input.name,
        input.aliases ?? '',
        input.role ?? 'supporting',
        input.appearance ?? '',
        input.personality ?? '',
        input.background ?? '',
        input.customAttributes ?? '{}'
      ]
    )

    const id = getLastInsertRowId()
    saveDatabase()
    return this.findById(id)!
  }

  update(input: UpdateCharacterInput): Character {
    const existing = this.findById(input.id)
    if (!existing) {
      throw new Error(`Character with id ${input.id} not found`)
    }

    run(
      `UPDATE characters
       SET name = ?,
           aliases = ?,
           role = ?,
           appearance = ?,
           personality = ?,
           background = ?,
           custom_attributes = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.name ?? existing.name,
        input.aliases ?? existing.aliases,
        input.role ?? existing.role,
        input.appearance ?? existing.appearance,
        input.personality ?? existing.personality,
        input.background ?? existing.background,
        input.customAttributes ?? existing.customAttributes,
        input.id
      ]
    )

    saveDatabase()
    return this.findById(input.id)!
  }

  delete(id: number): void {
    run('DELETE FROM characters WHERE id = ?', [id])
    saveDatabase()
  }
}
