import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { up as migration001 } from './migrations/001_initial'

let db: SqlJsDatabase | null = null
let dbPath: string = ''
let saveTimer: ReturnType<typeof setTimeout> | null = null

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData')
  dbPath = join(userDataPath, 'benji.db')

  // Locate sql.js WASM file
  const SQL = await initSqlJs({
    locateFile: (file) => {
      // In production, look for wasm in resources
      if (app.isPackaged) {
        return join(process.resourcesPath, file)
      }
      // In development, use node_modules path
      return join(__dirname, '../../node_modules/sql.js/dist', file)
    }
  })

  // Load existing database or create new one
  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;')

  // Run migrations
  migration001(db)

  // Save after initial migration
  saveDatabase()
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

// === Query helper functions for sql.js ===

/** Execute a SELECT and return all matching rows as an array of objects */
export function queryAll(sql: string, params?: any[]): any[] {
  const database = getDb()
  const stmt = database.prepare(sql)
  if (params) stmt.bind(params)
  const rows: any[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

/** Execute a SELECT and return the first matching row as an object, or null */
export function queryOne(sql: string, params?: any[]): any | null {
  const database = getDb()
  const stmt = database.prepare(sql)
  if (params) stmt.bind(params)
  let row = null
  if (stmt.step()) {
    row = stmt.getAsObject()
  }
  stmt.free()
  return row
}

/** Execute an INSERT / UPDATE / DELETE statement */
export function run(sql: string, params?: any[]): void {
  const database = getDb()
  database.run(sql, params)
}

/** Get the rowid of the last INSERT */
export function getLastInsertRowId(): number {
  const database = getDb()
  const result = database.exec('SELECT last_insert_rowid() as id')
  return result[0].values[0][0] as number
}

// Save database to disk (debounced for performance)
export function saveDatabase(): void {
  if (!db || !dbPath) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (!db || !dbPath) return
    try {
      const data = db.export()
      const dir = join(dbPath, '..')
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(dbPath, Buffer.from(data))
    } catch (e) {
      console.error('Failed to save database:', e)
    }
  }, 500)
}

// Force save (for app quit)
export function saveDatabaseSync(): void {
  if (!db || !dbPath) return
  try {
    const data = db.export()
    writeFileSync(dbPath, Buffer.from(data))
  } catch (e) {
    console.error('Failed to save database:', e)
  }
}
