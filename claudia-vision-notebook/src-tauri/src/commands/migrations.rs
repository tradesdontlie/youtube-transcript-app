use rusqlite::{Connection, Result as SqliteResult};

pub fn run_migrations(conn: &Connection) -> SqliteResult<()> {
    // Get current schema version
    let mut current_version: i32 = conn
        .query_row(
            "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Create schema_version table if it doesn't exist
    if current_version == 0 {
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at TEXT DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
    }

    // Migration 1: Add history tables
    if current_version < 1 {
        // Create claude_session_history table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS claude_session_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                session_name TEXT,
                project_path TEXT,
                model TEXT,
                messages TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                tags TEXT,
                summary TEXT,
                token_count INTEGER,
                status TEXT DEFAULT 'active'
            )",
            [],
        )?;

        // Create project_history table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS project_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_path TEXT NOT NULL UNIQUE,
                project_name TEXT,
                last_accessed TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                first_accessed TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                access_count INTEGER DEFAULT 1,
                total_sessions INTEGER DEFAULT 0,
                total_files_edited INTEGER DEFAULT 0,
                pinned BOOLEAN DEFAULT 0,
                tags TEXT
            )",
            [],
        )?;

        // Create notebook_entries table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS notebook_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entry_type TEXT NOT NULL,
                entry_id INTEGER,
                title TEXT NOT NULL,
                content_preview TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                tags TEXT,
                pinned BOOLEAN DEFAULT 0,
                metadata TEXT
            )",
            [],
        )?;

        // Create search_index table
        conn.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
                entry_id,
                entry_type,
                title,
                content,
                tags
            )",
            [],
        )?;

        // Create triggers for automatic timestamp updates
        conn.execute(
            "CREATE TRIGGER IF NOT EXISTS update_claude_session_timestamp 
             AFTER UPDATE ON claude_session_history 
             FOR EACH ROW
             BEGIN
                 UPDATE claude_session_history SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
             END",
            [],
        )?;

        conn.execute(
            "CREATE TRIGGER IF NOT EXISTS update_notebook_entry_timestamp 
             AFTER UPDATE ON notebook_entries 
             FOR EACH ROW
             BEGIN
                 UPDATE notebook_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
             END",
            [],
        )?;

        // Update schema version
        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            [1],
        )?;
        current_version = 1;
    }

    // Migration 2: Add indices for performance
    if current_version < 2 {
        // Create indices for better search performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_claude_sessions_updated 
             ON claude_session_history(updated_at DESC)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_claude_sessions_project 
             ON claude_session_history(project_path)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_notebook_entries_type 
             ON notebook_entries(entry_type, updated_at DESC)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_notebook_entries_pinned 
             ON notebook_entries(pinned DESC, updated_at DESC)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_project_history_access 
             ON project_history(last_accessed DESC)",
            [],
        )?;

        // Update schema version
        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            [2],
        )?;
        current_version = 2;
    }

    // Migration 3: Populate notebook entries from existing data
    if current_version < 3 {
        // Create notebook entries for existing transcript history
        conn.execute(
            "INSERT INTO notebook_entries (entry_type, entry_id, title, content_preview, created_at, tags)
             SELECT 'transcript', id, title, 
                    SUBSTR(transcript_text, 1, 200) as content_preview,
                    fetched_at, 
                    CASE WHEN channel IS NOT NULL THEN channel ELSE NULL END as tags
             FROM transcript_history
             WHERE NOT EXISTS (
                 SELECT 1 FROM notebook_entries 
                 WHERE entry_type = 'transcript' AND entry_id = transcript_history.id
             )",
            [],
        )?;

        // Update search index with transcript entries
        conn.execute(
            "INSERT INTO search_index (entry_id, entry_type, title, content, tags)
             SELECT ne.id, ne.entry_type, ne.title, 
                    COALESCE(ne.content_preview, ''), 
                    COALESCE(ne.tags, '')
             FROM notebook_entries ne
             WHERE ne.entry_type = 'transcript'
             AND NOT EXISTS (
                 SELECT 1 FROM search_index 
                 WHERE entry_id = ne.id AND entry_type = ne.entry_type
             )",
            [],
        )?;

        // Update schema version
        conn.execute(
            "INSERT INTO schema_version (version) VALUES (?1)",
            [3],
        )?;
        current_version = 3;
    }

    Ok(())
}