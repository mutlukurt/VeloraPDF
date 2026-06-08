use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

struct DbState(Mutex<Connection>);

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Page {
    id: String,
    title: String,
    icon: Option<String>,
    cover: Option<String>,
    parent_id: Option<String>,
    sort_order: i64,
    is_favorite: bool,
    is_archived: bool,
    created_at: String,
    updated_at: String,
    last_opened_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SearchResult {
    id: String,
    page_id: String,
    title: String,
    kind: String,
    snippet: String,
    updated_at: String,
}

fn now() -> String {
    Utc::now().to_rfc3339()
}

fn app_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {error}"))?;
    fs::create_dir_all(&dir).map_err(|error| format!("Could not create app data directory: {error}"))?;
    Ok(dir.join("velora_notes.sqlite3"))
}

fn setup_database(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS pages (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          icon TEXT,
          cover TEXT,
          parent_id TEXT REFERENCES pages(id) ON DELETE SET NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          is_favorite INTEGER NOT NULL DEFAULT 0,
          is_archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_opened_at TEXT
        );

        CREATE TABLE IF NOT EXISTS blocks (
          id TEXT PRIMARY KEY,
          page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
          parent_block_id TEXT REFERENCES blocks(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          content_json TEXT NOT NULL,
          properties_json TEXT NOT NULL DEFAULT '{}',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS page_links (
          id TEXT PRIMARY KEY,
          source_page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
          target_page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          color TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS page_tags (
          page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
          tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
          PRIMARY KEY (page_id, tag_id)
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
          item_id UNINDEXED,
          page_id UNINDEXED,
          kind UNINDEXED,
          title,
          body,
          tokenize='porter unicode61'
        );
        ",
    )?;

    let count: i64 = conn.query_row("SELECT COUNT(*) FROM pages", [], |row| row.get(0))?;
    if count == 0 {
        seed_welcome(conn)?;
    }
    rebuild_search_index(conn)?;
    Ok(())
}

fn seed_welcome(conn: &Connection) -> rusqlite::Result<()> {
    let page_id = Uuid::new_v4().to_string();
    let child_id = Uuid::new_v4().to_string();
    let timestamp = now();
    conn.execute(
        "INSERT INTO pages (id, title, icon, parent_id, sort_order, is_favorite, is_archived, created_at, updated_at, last_opened_at)
         VALUES (?1, 'Welcome to Velora', '🪨', NULL, 0, 1, 0, ?2, ?2, ?2)",
        params![page_id, timestamp],
    )?;
    conn.execute(
        "INSERT INTO pages (id, title, icon, parent_id, sort_order, is_favorite, is_archived, created_at, updated_at)
         VALUES (?1, 'First private workspace', '✦', ?2, 0, 0, 0, ?3, ?3)",
        params![child_id, page_id, timestamp],
    )?;

    let doc = json!({
      "type": "doc",
      "content": [
        {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Build your private workspace"}]},
        {"type": "paragraph", "content": [{"type": "text", "text": "Velora keeps notes, drafts, tasks, and references on this device. Stack small thoughts into a path you can return to."}]},
        {"type": "taskList", "content": [
          {"type": "taskItem", "attrs": {"checked": true}, "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Create a page"}]}]},
          {"type": "taskItem", "attrs": {"checked": false}, "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Capture an idea before it evaporates"}]}]}
        ]},
        {"type": "blockquote", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "A workspace is a marker. Velora is a place to leave markers for your future self."}]}]},
        {"type": "blockquote", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Toggle: Use slash commands to turn a blank line into headings, todos, dividers, code, and more."}]}]},
        {"type": "codeBlock", "attrs": {"language": "ts"}, "content": [{"type": "text", "text": "const workspace = \"local-first\";"}]},
        {"type": "horizontalRule"},
        {"type": "paragraph", "content": [{"type": "text", "text": "Create a subpage from the sidebar or with the command palette when a thought wants its own room."}]}
      ]
    });
    replace_page_blocks(conn, &page_id, &doc)?;
    Ok(())
}

fn row_to_page(row: &rusqlite::Row<'_>) -> rusqlite::Result<Page> {
    Ok(Page {
        id: row.get(0)?,
        title: row.get(1)?,
        icon: row.get(2)?,
        cover: row.get(3)?,
        parent_id: row.get(4)?,
        sort_order: row.get(5)?,
        is_favorite: row.get::<_, i64>(6)? == 1,
        is_archived: row.get::<_, i64>(7)? == 1,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
        last_opened_at: row.get(10)?,
    })
}

fn list_pages_inner(conn: &Connection) -> rusqlite::Result<Vec<Page>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, icon, cover, parent_id, sort_order, is_favorite, is_archived, created_at, updated_at, last_opened_at
         FROM pages WHERE is_archived = 0 ORDER BY parent_id IS NOT NULL, parent_id, sort_order, updated_at DESC",
    )?;
    let pages = stmt.query_map([], row_to_page)?.collect();
    pages
}

fn page_by_id(conn: &Connection, id: &str) -> rusqlite::Result<Option<Page>> {
    conn.query_row(
        "SELECT id, title, icon, cover, parent_id, sort_order, is_favorite, is_archived, created_at, updated_at, last_opened_at
         FROM pages WHERE id = ?1",
        params![id],
        row_to_page,
    )
    .optional()
}

fn extract_plain_text(value: &Value) -> String {
    match value {
        Value::String(text) => text.clone(),
        Value::Array(items) => items.iter().map(extract_plain_text).collect::<Vec<_>>().join(" "),
        Value::Object(map) => {
            let mut out = String::new();
            if let Some(Value::String(text)) = map.get("text") {
                out.push_str(text);
                out.push(' ');
            }
            if let Some(content) = map.get("content") {
                out.push_str(&extract_plain_text(content));
            }
            out
        }
        _ => String::new(),
    }
}

fn replace_page_blocks(conn: &Connection, page_id: &str, doc_json: &Value) -> rusqlite::Result<()> {
    let timestamp = now();
    conn.execute("DELETE FROM blocks WHERE page_id = ?1", params![page_id])?;
    let nodes = doc_json
        .get("content")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    for (index, node) in nodes.iter().enumerate() {
        let block_id = Uuid::new_v4().to_string();
        let block_type = node.get("type").and_then(Value::as_str).unwrap_or("paragraph");
        conn.execute(
            "INSERT INTO blocks (id, page_id, parent_block_id, type, content_json, properties_json, sort_order, created_at, updated_at)
             VALUES (?1, ?2, NULL, ?3, ?4, '{}', ?5, ?6, ?6)",
            params![block_id, page_id, block_type, node.to_string(), index as i64, timestamp],
        )?;
    }
    conn.execute(
        "UPDATE pages SET updated_at = ?1 WHERE id = ?2",
        params![timestamp, page_id],
    )?;
    rebuild_search_index(conn)?;
    Ok(())
}

fn rebuild_search_index(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM search_index", [])?;
    let mut pages = conn.prepare("SELECT id, title FROM pages WHERE is_archived = 0")?;
    let page_rows = pages.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?;
    for page in page_rows {
        let (id, title) = page?;
        conn.execute(
            "INSERT INTO search_index (item_id, page_id, kind, title, body) VALUES (?1, ?1, 'page', ?2, '')",
            params![id, title],
        )?;
    }

    let mut blocks = conn.prepare(
        "SELECT blocks.id, blocks.page_id, pages.title, blocks.content_json
         FROM blocks JOIN pages ON pages.id = blocks.page_id
         WHERE pages.is_archived = 0",
    )?;
    let block_rows = blocks.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
        ))
    })?;
    for block in block_rows {
        let (id, page_id, title, json_text) = block?;
        let value: Value = serde_json::from_str(&json_text).unwrap_or(Value::Null);
        let body = extract_plain_text(&value);
        if !body.trim().is_empty() {
            conn.execute(
                "INSERT INTO search_index (item_id, page_id, kind, title, body) VALUES (?1, ?2, 'block', ?3, ?4)",
                params![id, page_id, title, body],
            )?;
        }
    }
    Ok(())
}

#[tauri::command]
fn get_data_location(app: AppHandle) -> Result<String, String> {
    Ok(app_db_path(&app)?.display().to_string())
}

#[tauri::command]
fn list_pages(state: State<'_, DbState>) -> Result<Vec<Page>, String> {
    let conn = state.0.lock().map_err(|_| "Database is busy".to_string())?;
    list_pages_inner(&conn).map_err(|error| error.to_string())
}

#[tauri::command]
fn get_page(page_id: String, state: State<'_, DbState>) -> Result<Option<Page>, String> {
    let conn = state.0.lock().map_err(|_| "Database is busy".to_string())?;
    conn.execute(
        "UPDATE pages SET last_opened_at = ?1 WHERE id = ?2",
        params![now(), page_id],
    )
    .map_err(|error| error.to_string())?;
    page_by_id(&conn, &page_id).map_err(|error| error.to_string())
}

#[tauri::command]
fn create_page(
    title: Option<String>,
    parent_id: Option<String>,
    state: State<'_, DbState>,
) -> Result<Page, String> {
    let conn = state.0.lock().map_err(|_| "Database is busy".to_string())?;
    let id = Uuid::new_v4().to_string();
    let timestamp = now();
    let order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM pages WHERE parent_id IS ?1",
            params![parent_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    conn.execute(
        "INSERT INTO pages (id, title, icon, cover, parent_id, sort_order, is_favorite, is_archived, created_at, updated_at, last_opened_at)
         VALUES (?1, ?2, '📄', NULL, ?3, ?4, 0, 0, ?5, ?5, ?5)",
        params![id, title.unwrap_or_else(|| "Untitled".to_string()), parent_id, order, timestamp],
    )
    .map_err(|error| error.to_string())?;
    replace_page_blocks(&conn, &id, &json!({"type":"doc","content":[{"type":"paragraph"}]}))
        .map_err(|error| error.to_string())?;
    page_by_id(&conn, &id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Created page could not be loaded".to_string())
}

#[tauri::command]
fn update_page_metadata(page: Page, state: State<'_, DbState>) -> Result<Page, String> {
    let conn = state.0.lock().map_err(|_| "Database is busy".to_string())?;
    let timestamp = now();
    conn.execute(
        "UPDATE pages
         SET title = ?1, icon = ?2, cover = ?3, parent_id = ?4, sort_order = ?5, is_favorite = ?6, is_archived = ?7, updated_at = ?8
         WHERE id = ?9",
        params![
            page.title,
            page.icon,
            page.cover,
            page.parent_id,
            page.sort_order,
            if page.is_favorite { 1 } else { 0 },
            if page.is_archived { 1 } else { 0 },
            timestamp,
            page.id
        ],
    )
    .map_err(|error| error.to_string())?;
    rebuild_search_index(&conn).map_err(|error| error.to_string())?;
    page_by_id(&conn, &page.id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Page not found".to_string())
}

#[tauri::command]
fn archive_page(page_id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "Database is busy".to_string())?;
    conn.execute(
        "UPDATE pages SET is_archived = 1, updated_at = ?1 WHERE id = ?2",
        params![now(), page_id],
    )
    .map_err(|error| error.to_string())?;
    rebuild_search_index(&conn).map_err(|error| error.to_string())
}

#[tauri::command]
fn load_page_content(page_id: String, state: State<'_, DbState>) -> Result<Value, String> {
    let conn = state.0.lock().map_err(|_| "Database is busy".to_string())?;
    let mut stmt = conn
        .prepare("SELECT content_json FROM blocks WHERE page_id = ?1 ORDER BY sort_order ASC")
        .map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map(params![page_id], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?;
    let mut content = Vec::new();
    for row in rows {
        let text = row.map_err(|error| error.to_string())?;
        content.push(serde_json::from_str::<Value>(&text).unwrap_or(json!({"type":"paragraph"})));
    }
    Ok(json!({ "type": "doc", "content": content }))
}

#[tauri::command]
fn save_page_content(page_id: String, doc_json: Value, state: State<'_, DbState>) -> Result<Page, String> {
    let conn = state.0.lock().map_err(|_| "Database is busy".to_string())?;
    replace_page_blocks(&conn, &page_id, &doc_json).map_err(|error| error.to_string())?;
    page_by_id(&conn, &page_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Page not found".to_string())
}

#[tauri::command]
fn search_workspace(query: String, state: State<'_, DbState>) -> Result<Vec<SearchResult>, String> {
    let conn = state.0.lock().map_err(|_| "Database is busy".to_string())?;
    let trimmed = query.trim();
    if trimmed.is_empty() {
        let mut stmt = conn
            .prepare(
                "SELECT id, id, 'page', title, title, updated_at FROM pages
                 WHERE is_archived = 0 ORDER BY last_opened_at DESC NULLS LAST, updated_at DESC LIMIT 12",
            )
            .map_err(|error| error.to_string())?;
        return stmt
            .query_map([], |row| {
                Ok(SearchResult {
                    id: row.get(0)?,
                    page_id: row.get(1)?,
                    kind: row.get(2)?,
                    title: row.get(3)?,
                    snippet: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })
            .map_err(|error| error.to_string())?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|error| error.to_string());
    }

    let fts_query = trimmed
        .split_whitespace()
        .map(|part| format!("{}*", part.replace('"', "")))
        .collect::<Vec<_>>()
        .join(" ");
    let mut stmt = conn
        .prepare(
            "SELECT search_index.item_id, search_index.page_id, search_index.kind, search_index.title,
                    snippet(search_index, 4, '', '', ' … ', 12), pages.updated_at
             FROM search_index
             JOIN pages ON pages.id = search_index.page_id
             WHERE search_index MATCH ?1
             LIMIT 24",
        )
        .map_err(|error| error.to_string())?;
    let results = stmt.query_map(params![fts_query], |row| {
        let page_id: String = row.get(1)?;
        Ok(SearchResult {
            id: row.get(0)?,
            page_id,
            kind: row.get(2)?,
            title: row.get(3)?,
            snippet: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })
    .map_err(|error| error.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|error| error.to_string());
    results
}

#[tauri::command]
fn export_workspace_backup(state: State<'_, DbState>) -> Result<Value, String> {
    let conn = state.0.lock().map_err(|_| "Database is busy".to_string())?;
    let pages = list_pages_inner(&conn).map_err(|error| error.to_string())?;
    let mut stmt = conn
        .prepare("SELECT page_id, content_json, sort_order FROM blocks ORDER BY page_id, sort_order")
        .map_err(|error| error.to_string())?;
    let blocks = stmt
        .query_map([], |row| {
            Ok(json!({
                "pageId": row.get::<_, String>(0)?,
                "content": serde_json::from_str::<Value>(&row.get::<_, String>(1)?).unwrap_or(Value::Null),
                "sortOrder": row.get::<_, i64>(2)?,
            }))
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())?;
    Ok(json!({ "version": 1, "exportedAt": now(), "pages": pages, "blocks": blocks }))
}

#[tauri::command]
fn import_workspace_backup(backup: Value, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "Database is busy".to_string())?;
    let pages = backup
        .get("pages")
        .and_then(Value::as_array)
        .ok_or_else(|| "Backup is missing pages".to_string())?;
    let blocks = backup
        .get("blocks")
        .and_then(Value::as_array)
        .ok_or_else(|| "Backup is missing blocks".to_string())?;
    let timestamp = now();

    conn.execute_batch(
        "
        DELETE FROM page_tags;
        DELETE FROM page_links;
        DELETE FROM blocks;
        DELETE FROM pages;
        ",
    )
    .map_err(|error| error.to_string())?;

    for page_value in pages {
        let page: Page = serde_json::from_value(page_value.clone()).map_err(|error| error.to_string())?;
        conn.execute(
            "INSERT INTO pages (id, title, icon, cover, parent_id, sort_order, is_favorite, is_archived, created_at, updated_at, last_opened_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                page.id,
                page.title,
                page.icon,
                page.cover,
                page.parent_id,
                page.sort_order,
                if page.is_favorite { 1 } else { 0 },
                if page.is_archived { 1 } else { 0 },
                page.created_at,
                page.updated_at,
                page.last_opened_at
            ],
        )
        .map_err(|error| error.to_string())?;
    }

    for (index, block_value) in blocks.iter().enumerate() {
        let page_id = block_value
            .get("pageId")
            .and_then(Value::as_str)
            .ok_or_else(|| "Backup block is missing pageId".to_string())?;
        let content = block_value
            .get("content")
            .cloned()
            .unwrap_or_else(|| json!({"type":"paragraph"}));
        let block_type = content.get("type").and_then(Value::as_str).unwrap_or("paragraph");
        let sort_order = block_value
            .get("sortOrder")
            .and_then(Value::as_i64)
            .unwrap_or(index as i64);
        conn.execute(
            "INSERT INTO blocks (id, page_id, parent_block_id, type, content_json, properties_json, sort_order, created_at, updated_at)
             VALUES (?1, ?2, NULL, ?3, ?4, '{}', ?5, ?6, ?6)",
            params![Uuid::new_v4().to_string(), page_id, block_type, content.to_string(), sort_order, timestamp],
        )
        .map_err(|error| error.to_string())?;
    }

    rebuild_search_index(&conn).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_file_to_downloads(
    filename: String,
    data: Vec<u8>,
    app: AppHandle,
) -> Result<String, String> {
    let safe_filename = Path::new(&filename)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .ok_or_else(|| "Invalid file name".to_string())?;
    let download_dir = app
        .path()
        .download_dir()
        .map_err(|error| format!("Could not resolve Downloads directory: {error}"))?;
    let target_path = download_dir.join(safe_filename);
    fs::write(&target_path, data)
        .map_err(|error| format!("Failed to write file to disk: {error}"))?;
    Ok(target_path.display().to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let db_path = app_db_path(&app.handle())
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            let conn = Connection::open(db_path)?;
            setup_database(&conn)?;
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_data_location,
            list_pages,
            get_page,
            create_page,
            update_page_metadata,
            archive_page,
            load_page_content,
            save_page_content,
            search_workspace,
            export_workspace_backup,
            import_workspace_backup,
            save_file_to_downloads
        ])
        .run(tauri::generate_context!())
        .expect("error while running Velora PDF");
}
