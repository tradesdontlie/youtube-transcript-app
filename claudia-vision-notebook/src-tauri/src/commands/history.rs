use serde::{Deserialize, Serialize};
use tauri::{command, State};
use crate::commands::agents::AgentDb;
use rusqlite::{params, Result as SqliteResult};
use chrono::{DateTime, Utc, Local};

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaudeSessionHistory {
    pub id: i64,
    pub session_id: String,
    pub session_name: Option<String>,
    pub project_path: Option<String>,
    pub model: Option<String>,
    pub messages: String, // JSON string
    pub created_at: String,
    pub updated_at: String,
    pub tags: Option<String>,
    pub summary: Option<String>,
    pub token_count: Option<i64>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectHistory {
    pub id: i64,
    pub project_path: String,
    pub project_name: Option<String>,
    pub last_accessed: String,
    pub first_accessed: String,
    pub access_count: i64,
    pub total_sessions: i64,
    pub total_files_edited: i64,
    pub pinned: bool,
    pub tags: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotebookEntry {
    pub id: i64,
    pub entry_type: String,
    pub entry_id: Option<i64>,
    pub title: String,
    pub content_preview: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub tags: Option<String>,
    pub pinned: bool,
    pub metadata: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub entry_id: i64,
    pub entry_type: String,
    pub title: String,
    pub content_snippet: String,
    pub tags: Option<String>,
    pub relevance_score: f64,
}

/// Save or update Claude session history
#[command]
pub async fn save_claude_session(
    db: State<'_, AgentDb>,
    session_id: String,
    session_name: Option<String>,
    project_path: Option<String>,
    model: Option<String>,
    messages: String,
    tags: Option<Vec<String>>,
    summary: Option<String>,
    token_count: Option<i64>,
) -> Result<i64, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let tags_str = tags.map(|t| t.join(","));
    
    let result = conn.execute(
        "INSERT OR REPLACE INTO claude_session_history 
        (session_id, session_name, project_path, model, messages, tags, summary, token_count, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)",
        params![
            &session_id,
            &session_name,
            &project_path,
            &model,
            &messages,
            &tags_str,
            &summary,
            &token_count
        ],
    );
    
    match result {
        Ok(_) => {
            // Update project history if project_path is provided
            if let Some(ref path) = project_path {
                let _ = update_project_access(&conn, path);
            }
            
            // Get the inserted/updated ID
            let id = conn.last_insert_rowid();
            
            // Create notebook entry
            let _ = create_notebook_entry(
                &conn,
                "claude_session",
                Some(id),
                &session_name.unwrap_or_else(|| format!("Session {}", session_id)),
                summary.as_deref(),
                tags_str.as_deref(),
            );
            
            Ok(id)
        }
        Err(e) => Err(format!("Failed to save session: {}", e))
    }
}

/// Get Claude session history with pagination and search
#[command]
pub async fn get_claude_sessions(
    db: State<'_, AgentDb>,
    limit: Option<i64>,
    offset: Option<i64>,
    search: Option<String>,
    project_path: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<Vec<ClaudeSessionHistory>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let mut query = String::from(
        "SELECT id, session_id, session_name, project_path, model, messages, 
         created_at, updated_at, tags, summary, token_count, status
         FROM claude_session_history WHERE 1=1"
    );
    
    let mut params: Vec<String> = Vec::new();
    
    if let Some(search_term) = search {
        query.push_str(" AND (session_name LIKE ? OR messages LIKE ? OR summary LIKE ?)");
        let search_pattern = format!("%{}%", search_term);
        params.push(search_pattern.clone());
        params.push(search_pattern.clone());
        params.push(search_pattern);
    }
    
    if let Some(project) = project_path {
        query.push_str(" AND project_path = ?");
        params.push(project);
    }
    
    if let Some(tag_list) = tags {
        for tag in tag_list {
            query.push_str(" AND tags LIKE ?");
            params.push(format!("%{}%", tag));
        }
    }
    
    query.push_str(" ORDER BY updated_at DESC LIMIT ? OFFSET ?");
    
    let limit_val = limit.unwrap_or(20);
    let offset_val = offset.unwrap_or(0);
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter()
        .map(|s| s as &dyn rusqlite::ToSql)
        .chain(vec![&limit_val as &dyn rusqlite::ToSql, &offset_val as &dyn rusqlite::ToSql])
        .collect();
    
    let sessions = stmt.query_map(&param_refs[..], |row| {
        Ok(ClaudeSessionHistory {
            id: row.get(0)?,
            session_id: row.get(1)?,
            session_name: row.get(2)?,
            project_path: row.get(3)?,
            model: row.get(4)?,
            messages: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            tags: row.get(8)?,
            summary: row.get(9)?,
            token_count: row.get(10)?,
            status: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut results = Vec::new();
    for session in sessions {
        results.push(session.map_err(|e| e.to_string())?);
    }
    
    Ok(results)
}

/// Get project history
#[command]
pub async fn get_project_history(
    db: State<'_, AgentDb>,
    limit: Option<i64>,
    offset: Option<i64>,
    pinned_only: Option<bool>,
) -> Result<Vec<ProjectHistory>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let mut query = String::from(
        "SELECT id, project_path, project_name, last_accessed, first_accessed,
         access_count, total_sessions, total_files_edited, pinned, tags
         FROM project_history WHERE 1=1"
    );
    
    if pinned_only.unwrap_or(false) {
        query.push_str(" AND pinned = 1");
    }
    
    query.push_str(" ORDER BY pinned DESC, last_accessed DESC LIMIT ? OFFSET ?");
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    
    let projects = stmt.query_map(
        params![limit.unwrap_or(20), offset.unwrap_or(0)],
        |row| {
            Ok(ProjectHistory {
                id: row.get(0)?,
                project_path: row.get(1)?,
                project_name: row.get(2)?,
                last_accessed: row.get(3)?,
                first_accessed: row.get(4)?,
                access_count: row.get(5)?,
                total_sessions: row.get(6)?,
                total_files_edited: row.get(7)?,
                pinned: row.get(8)?,
                tags: row.get(9)?,
            })
        }
    ).map_err(|e| e.to_string())?;
    
    let mut results = Vec::new();
    for project in projects {
        results.push(project.map_err(|e| e.to_string())?);
    }
    
    Ok(results)
}

/// Search across all notebook entries
#[command]
pub async fn search_notebook(
    db: State<'_, AgentDb>,
    query: String,
    entry_types: Option<Vec<String>>,
    limit: Option<i64>,
) -> Result<Vec<SearchResult>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let mut search_query = String::from(
        "SELECT entry_id, entry_type, title, snippet(search_index, 3, '<mark>', '</mark>', '...', 32) as snippet,
         tags, rank
         FROM search_index
         WHERE search_index MATCH ?
         "
    );
    
    if let Some(types) = entry_types {
        let type_conditions: Vec<String> = types.iter()
            .map(|t| format!("entry_type = '{}'", t))
            .collect();
        search_query.push_str(&format!(" AND ({})", type_conditions.join(" OR ")));
    }
    
    search_query.push_str(" ORDER BY rank LIMIT ?");
    
    let mut stmt = conn.prepare(&search_query).map_err(|e| e.to_string())?;
    
    let results = stmt.query_map(
        params![query, limit.unwrap_or(50)],
        |row| {
            Ok(SearchResult {
                entry_id: row.get(0)?,
                entry_type: row.get(1)?,
                title: row.get(2)?,
                content_snippet: row.get(3)?,
                tags: row.get(4)?,
                relevance_score: row.get::<_, f64>(5)?.abs(),
            })
        }
    ).map_err(|e| e.to_string())?;
    
    let mut search_results = Vec::new();
    for result in results {
        search_results.push(result.map_err(|e| e.to_string())?);
    }
    
    Ok(search_results)
}

/// Get notebook entries with filtering
#[command]
pub async fn get_notebook_entries(
    db: State<'_, AgentDb>,
    entry_type: Option<String>,
    pinned_only: Option<bool>,
    tags: Option<Vec<String>>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<NotebookEntry>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let mut query = String::from(
        "SELECT id, entry_type, entry_id, title, content_preview,
         created_at, updated_at, tags, pinned, metadata
         FROM notebook_entries WHERE 1=1"
    );
    
    let mut params: Vec<String> = Vec::new();
    
    if let Some(etype) = entry_type {
        query.push_str(" AND entry_type = ?");
        params.push(etype);
    }
    
    if pinned_only.unwrap_or(false) {
        query.push_str(" AND pinned = 1");
    }
    
    if let Some(tag_list) = tags {
        for tag in tag_list {
            query.push_str(" AND tags LIKE ?");
            params.push(format!("%{}%", tag));
        }
    }
    
    query.push_str(" ORDER BY pinned DESC, updated_at DESC LIMIT ? OFFSET ?");
    
    let limit_val = limit.unwrap_or(20);
    let offset_val = offset.unwrap_or(0);
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter()
        .map(|s| s as &dyn rusqlite::ToSql)
        .chain(vec![&limit_val as &dyn rusqlite::ToSql, &offset_val as &dyn rusqlite::ToSql])
        .collect();
    
    let entries = stmt.query_map(&param_refs[..], |row| {
        Ok(NotebookEntry {
            id: row.get(0)?,
            entry_type: row.get(1)?,
            entry_id: row.get(2)?,
            title: row.get(3)?,
            content_preview: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            tags: row.get(7)?,
            pinned: row.get(8)?,
            metadata: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut results = Vec::new();
    for entry in entries {
        results.push(entry.map_err(|e| e.to_string())?);
    }
    
    Ok(results)
}

/// Toggle pin status for a notebook entry
#[command]
pub async fn toggle_pin_entry(
    db: State<'_, AgentDb>,
    entry_id: i64,
) -> Result<bool, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "UPDATE notebook_entries SET pinned = NOT pinned WHERE id = ?",
        params![entry_id],
    ).map_err(|e| format!("Failed to toggle pin: {}", e))?;
    
    // Get the new pinned status
    let pinned: bool = conn.query_row(
        "SELECT pinned FROM notebook_entries WHERE id = ?",
        params![entry_id],
        |row| row.get(0)
    ).map_err(|e| format!("Failed to get pin status: {}", e))?;
    
    Ok(pinned)
}

/// Update tags for a notebook entry
#[command]
pub async fn update_entry_tags(
    db: State<'_, AgentDb>,
    entry_id: i64,
    tags: Vec<String>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let tags_str = tags.join(",");
    
    conn.execute(
        "UPDATE notebook_entries SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![tags_str, entry_id],
    ).map_err(|e| format!("Failed to update tags: {}", e))?;
    
    // Update search index
    let entry: (String, String, Option<String>) = conn.query_row(
        "SELECT entry_type, title, content_preview FROM notebook_entries WHERE id = ?",
        params![entry_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    ).map_err(|e| format!("Failed to get entry: {}", e))?;
    
    // Update search index
    conn.execute(
        "UPDATE search_index SET tags = ? WHERE entry_id = ? AND entry_type = ?",
        params![tags_str, entry_id, entry.0],
    ).map_err(|e| format!("Failed to update search index: {}", e))?;
    
    Ok(())
}

// Helper functions

fn update_project_access(conn: &rusqlite::Connection, project_path: &str) -> SqliteResult<()> {
    conn.execute(
        "INSERT INTO project_history (project_path, project_name)
         VALUES (?1, ?2)
         ON CONFLICT(project_path) DO UPDATE SET
         last_accessed = CURRENT_TIMESTAMP,
         access_count = access_count + 1",
        params![
            project_path,
            std::path::Path::new(project_path)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Unknown Project")
        ],
    )?;
    Ok(())
}

fn create_notebook_entry(
    conn: &rusqlite::Connection,
    entry_type: &str,
    entry_id: Option<i64>,
    title: &str,
    content_preview: Option<&str>,
    tags: Option<&str>,
) -> SqliteResult<()> {
    let id = conn.execute(
        "INSERT INTO notebook_entries (entry_type, entry_id, title, content_preview, tags)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![entry_type, entry_id, title, content_preview, tags],
    )?;
    
    // Add to search index
    conn.execute(
        "INSERT INTO search_index (entry_id, entry_type, title, content, tags)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            conn.last_insert_rowid(),
            entry_type,
            title,
            content_preview.unwrap_or(""),
            tags.unwrap_or("")
        ],
    )?;
    
    Ok(())
}

/// Delete old sessions older than specified days
#[command]
pub async fn cleanup_old_sessions(
    db: State<'_, AgentDb>,
    days_old: i64,
) -> Result<i64, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let cutoff_date = Local::now() - chrono::Duration::days(days_old);
    let cutoff_str = cutoff_date.format("%Y-%m-%d %H:%M:%S").to_string();
    
    let deleted = conn.execute(
        "DELETE FROM claude_session_history WHERE updated_at < ? AND status != 'pinned'",
        params![cutoff_str],
    ).map_err(|e| format!("Failed to cleanup sessions: {}", e))?;
    
    Ok(deleted as i64)
}