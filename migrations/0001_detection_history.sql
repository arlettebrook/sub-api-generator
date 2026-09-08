CREATE TABLE IF NOT EXISTS detection_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_path TEXT NOT NULL,
  detected_at INTEGER NOT NULL,
  raw_count INTEGER NOT NULL DEFAULT 0,
  kept_count INTEGER NOT NULL DEFAULT 0,
  filtered_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  nodes_json TEXT NOT NULL DEFAULT '[]',
  raw_nodes_json TEXT NOT NULL DEFAULT '[]',
  raw_sources_json TEXT NOT NULL DEFAULT '[]',
  node_sources_json TEXT NOT NULL DEFAULT '[]',
  source_meta_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_detection_history_api_time
  ON detection_history(api_path, detected_at DESC, id DESC);
