ALTER TABLE detection_history ADD COLUMN filtered_nodes_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE detection_history ADD COLUMN filtered_sources_json TEXT NOT NULL DEFAULT '[]';
