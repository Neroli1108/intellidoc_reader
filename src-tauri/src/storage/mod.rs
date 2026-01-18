//! Storage and persistence module

use crate::annotation::{Annotation, AnnotationUpdate};
use crate::document::{Document, RecentDocument};
use crate::error::{AppError, StorageError};
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

/// Database connection wrapper
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    fn new(conn: Connection) -> Self {
        Self {
            conn: Mutex::new(conn),
        }
    }
}

/// Get the database path for the application
fn get_database_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| StorageError::Database(e.to_string()))?;

    // Ensure directory exists
    std::fs::create_dir_all(&app_data)?;

    Ok(app_data.join("intellidoc.db"))
}

/// Initialize the database and run migrations
pub async fn init_database(app: &AppHandle) -> Result<(), AppError> {
    let db_path = get_database_path(app)?;
    tracing::info!("Initializing database at {:?}", db_path);

    let conn = Connection::open(&db_path)
        .map_err(|e| StorageError::Database(e.to_string()))?;

    // Run migrations
    conn.execute_batch(
        r#"
        -- Documents table
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            file_path TEXT NOT NULL,
            title TEXT,
            authors TEXT,
            category TEXT DEFAULT 'unknown',
            page_count INTEGER,
            word_count INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_opened TEXT,
            metadata TEXT
        );

        -- Annotations table
        CREATE TABLE IF NOT EXISTS annotations (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            page_number INTEGER NOT NULL,
            paragraph_id TEXT,
            start_offset INTEGER NOT NULL,
            end_offset INTEGER NOT NULL,
            selected_text TEXT,
            highlight_color TEXT,
            note TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Chat messages table
        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            context_page INTEGER,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Code snippets table
        CREATE TABLE IF NOT EXISTS code_snippets (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            language TEXT NOT NULL,
            framework TEXT,
            code TEXT NOT NULL,
            description TEXT,
            section_reference TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_annotations_document ON annotations(document_id);
        CREATE INDEX IF NOT EXISTS idx_chat_document ON chat_messages(document_id);
        CREATE INDEX IF NOT EXISTS idx_code_document ON code_snippets(document_id);
        CREATE INDEX IF NOT EXISTS idx_documents_last_opened ON documents(last_opened DESC);
        "#,
    )
    .map_err(|e| StorageError::Migration(e.to_string()))?;

    // Store database in app state
    app.manage(Database::new(conn));

    tracing::info!("Database initialized successfully");
    Ok(())
}

/// Add a document to recent documents
pub async fn add_recent_document(app: &AppHandle, doc: &Document) -> Result<(), AppError> {
    let db = app.state::<Database>();
    let conn = db.conn.lock().unwrap();

    let authors_json = serde_json::to_string(&doc.authors)
        .map_err(|e| StorageError::Serialization(e.to_string()))?;
    let metadata_json = serde_json::to_string(&doc.metadata)
        .map_err(|e| StorageError::Serialization(e.to_string()))?;
    let category = format!("{:?}", doc.category).to_lowercase();

    conn.execute(
        r#"
        INSERT OR REPLACE INTO documents 
        (id, file_path, title, authors, category, page_count, word_count, last_opened, metadata)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'), ?8)
        "#,
        params![
            doc.id,
            doc.path,
            doc.title,
            authors_json,
            category,
            doc.metadata.page_count,
            doc.metadata.word_count,
            metadata_json,
        ],
    )
    .map_err(|e| StorageError::Database(e.to_string()))?;

    Ok(())
}

/// Get recent documents
pub async fn get_recent_documents(
    app: &AppHandle,
    limit: usize,
) -> Result<Vec<RecentDocument>, AppError> {
    let db = app.state::<Database>();
    let conn = db.conn.lock().unwrap();

    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, title, file_path, category, last_opened, page_count
            FROM documents
            ORDER BY last_opened DESC
            LIMIT ?1
            "#,
        )
        .map_err(|e| StorageError::Database(e.to_string()))?;

    let docs = stmt
        .query_map([limit], |row| {
            Ok(RecentDocument {
                id: row.get(0)?,
                title: row.get(1)?,
                path: row.get(2)?,
                category: serde_json::from_str(&row.get::<_, String>(3)?)
                    .unwrap_or_default(),
                last_opened: row.get(4)?,
                page_count: row.get(5)?,
            })
        })
        .map_err(|e| StorageError::Database(e.to_string()))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(docs)
}

/// Save an annotation
pub async fn save_annotation(app: &AppHandle, annotation: &Annotation) -> Result<(), AppError> {
    let db = app.state::<Database>();
    let conn = db.conn.lock().unwrap();

    let color = annotation
        .highlight_color
        .as_ref()
        .map(|c| format!("{:?}", c).to_lowercase());

    conn.execute(
        r#"
        INSERT INTO annotations 
        (id, document_id, page_number, paragraph_id, start_offset, end_offset, 
         selected_text, highlight_color, note, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        "#,
        params![
            annotation.id.to_string(),
            annotation.document_id,
            annotation.page_number,
            annotation.paragraph_id,
            annotation.start_offset,
            annotation.end_offset,
            annotation.selected_text,
            color,
            annotation.note,
            annotation.created_at.to_rfc3339(),
            annotation.updated_at.to_rfc3339(),
        ],
    )
    .map_err(|e| StorageError::Database(e.to_string()))?;

    Ok(())
}

/// Get annotations for a document
pub async fn get_annotations(
    app: &AppHandle,
    document_id: &str,
) -> Result<Vec<Annotation>, AppError> {
    let db = app.state::<Database>();
    let conn = db.conn.lock().unwrap();

    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, document_id, page_number, paragraph_id, start_offset, end_offset,
                   selected_text, highlight_color, note, created_at, updated_at
            FROM annotations
            WHERE document_id = ?1
            ORDER BY page_number, start_offset
            "#,
        )
        .map_err(|e| StorageError::Database(e.to_string()))?;

    let annotations = stmt
        .query_map([document_id], |row| {
            let color_str: Option<String> = row.get(7)?;
            let color = color_str.and_then(|c| match c.as_str() {
                "yellow" => Some(crate::annotation::HighlightColor::Yellow),
                "green" => Some(crate::annotation::HighlightColor::Green),
                "blue" => Some(crate::annotation::HighlightColor::Blue),
                "purple" => Some(crate::annotation::HighlightColor::Purple),
                "red" => Some(crate::annotation::HighlightColor::Red),
                _ => None,
            });

            Ok(Annotation {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_default(),
                document_id: row.get(1)?,
                page_number: row.get(2)?,
                paragraph_id: row.get(3)?,
                start_offset: row.get(4)?,
                end_offset: row.get(5)?,
                selected_text: row.get(6)?,
                highlight_color: color,
                note: row.get(8)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(9)?)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or_else(|_| chrono::Utc::now()),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or_else(|_| chrono::Utc::now()),
            })
        })
        .map_err(|e| StorageError::Database(e.to_string()))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(annotations)
}

/// Update an annotation
pub async fn update_annotation(
    app: &AppHandle,
    id: Uuid,
    update: AnnotationUpdate,
) -> Result<Annotation, AppError> {
    let db = app.state::<Database>();
    let conn = db.conn.lock().unwrap();

    // Get current annotation
    let mut annotations = get_annotations_by_id(&conn, id)?;
    let mut annotation = annotations
        .pop()
        .ok_or_else(|| crate::error::AnnotationError::NotFound(id.to_string()))?;

    // Apply updates
    update.apply_to(&mut annotation);

    // Save updates
    let color = annotation
        .highlight_color
        .as_ref()
        .map(|c| format!("{:?}", c).to_lowercase());

    conn.execute(
        r#"
        UPDATE annotations 
        SET highlight_color = ?1, note = ?2, updated_at = ?3
        WHERE id = ?4
        "#,
        params![
            color,
            annotation.note,
            annotation.updated_at.to_rfc3339(),
            id.to_string(),
        ],
    )
    .map_err(|e| StorageError::Database(e.to_string()))?;

    Ok(annotation)
}

/// Delete an annotation
pub async fn delete_annotation(app: &AppHandle, id: Uuid) -> Result<(), AppError> {
    let db = app.state::<Database>();
    let conn = db.conn.lock().unwrap();

    conn.execute("DELETE FROM annotations WHERE id = ?1", [id.to_string()])
        .map_err(|e| StorageError::Database(e.to_string()))?;

    Ok(())
}

/// Helper to get annotation by ID
fn get_annotations_by_id(conn: &Connection, id: Uuid) -> Result<Vec<Annotation>, AppError> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, document_id, page_number, paragraph_id, start_offset, end_offset,
                   selected_text, highlight_color, note, created_at, updated_at
            FROM annotations
            WHERE id = ?1
            "#,
        )
        .map_err(|e| StorageError::Database(e.to_string()))?;

    let annotations = stmt
        .query_map([id.to_string()], |row| {
            let color_str: Option<String> = row.get(7)?;
            let color = color_str.and_then(|c| match c.as_str() {
                "yellow" => Some(crate::annotation::HighlightColor::Yellow),
                "green" => Some(crate::annotation::HighlightColor::Green),
                "blue" => Some(crate::annotation::HighlightColor::Blue),
                "purple" => Some(crate::annotation::HighlightColor::Purple),
                "red" => Some(crate::annotation::HighlightColor::Red),
                _ => None,
            });

            Ok(Annotation {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_default(),
                document_id: row.get(1)?,
                page_number: row.get(2)?,
                paragraph_id: row.get(3)?,
                start_offset: row.get(4)?,
                end_offset: row.get(5)?,
                selected_text: row.get(6)?,
                highlight_color: color,
                note: row.get(8)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(9)?)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or_else(|_| chrono::Utc::now()),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or_else(|_| chrono::Utc::now()),
            })
        })
        .map_err(|e| StorageError::Database(e.to_string()))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(annotations)
}
