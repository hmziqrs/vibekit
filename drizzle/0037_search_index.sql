-- Full-text search using SQLite FTS5
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  entity_type,
  entity_id,
  title,
  content,
  metadata,
  content='',
  tokenize='porter unicode61'
);

-- Contentless FTS5 table for efficient search
-- We store metadata in a separate table for retrieval
CREATE TABLE IF NOT EXISTS search_content (
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  updated_at INTEGER DEFAULT (CAST(unixepoch('subsecond') * 1000 AS INTEGER)),
  PRIMARY KEY (entity_type, entity_id)
);

-- Triggers to keep FTS in sync with content table
CREATE TRIGGER IF NOT EXISTS search_content_ai AFTER INSERT ON search_content BEGIN
  INSERT INTO search_index (rowid, entity_type, entity_id, title, content, metadata)
  VALUES (new.rowid, new.entity_type, new.entity_id, new.title, new.content, new.metadata);
END;

CREATE TRIGGER IF NOT EXISTS search_content_ad AFTER DELETE ON search_content BEGIN
  INSERT INTO search_index (search_index, rowid, entity_type, entity_id, title, content, metadata)
  VALUES ('delete', old.rowid, old.entity_type, old.entity_id, old.title, old.content, old.metadata);
END;

CREATE TRIGGER IF NOT EXISTS search_content_au AFTER UPDATE ON search_content BEGIN
  INSERT INTO search_index (search_index, rowid, entity_type, entity_id, title, content, metadata)
  VALUES ('delete', old.rowid, old.entity_type, old.entity_id, old.title, old.content, old.metadata);
  INSERT INTO search_index (rowid, entity_type, entity_id, title, content, metadata)
  VALUES (new.rowid, new.entity_type, new.entity_id, new.title, new.content, new.metadata);
END;
