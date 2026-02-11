import type { Database as SqlJsDatabase } from 'sql.js'

export function up(db: SqlJsDatabase): void {
  // 大纲表
  db.run(`
    CREATE TABLE IF NOT EXISTS outlines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('beat_sheet', 'chapter_outline', 'synopsis', 'scene_outline')),
      title TEXT NOT NULL,
      content TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  // 故事笔记表
  db.run(`
    CREATE TABLE IF NOT EXISTS story_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('plot', 'character', 'scene', 'research', 'idea', 'other')),
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  // 写作风格配置表
  db.run(`
    CREATE TABLE IF NOT EXISTS writing_style_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      name TEXT NOT NULL,
      sample_text TEXT DEFAULT '',
      analysis TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  // 生成历史表
  db.run(`
    CREATE TABLE IF NOT EXISTS generation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      chapter_id INTEGER,
      action TEXT NOT NULL,
      input_text TEXT DEFAULT '',
      output_text TEXT DEFAULT '',
      options TEXT,
      accepted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
    )
  `)

  // 索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_outlines_project ON outlines(project_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_story_notes_project ON story_notes(project_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_story_notes_category ON story_notes(project_id, category)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_writing_styles_project ON writing_style_profiles(project_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_gen_history_project ON generation_history(project_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_gen_history_chapter ON generation_history(chapter_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_gen_history_action ON generation_history(project_id, action)`)
}
