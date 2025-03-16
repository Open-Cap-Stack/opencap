-- First drop dependent tables
DROP TABLE IF EXISTS dataset_schema CASCADE;
DROP TABLE IF EXISTS ingestion_logs CASCADE;
DROP TABLE IF EXISTS datasets CASCADE;

-- Recreate the main table
CREATE TABLE IF NOT EXISTS datasets (
  id SERIAL PRIMARY KEY,
  dataset_name VARCHAR(255) NOT NULL,
  storage_location VARCHAR(255) NOT NULL,
  description TEXT,
  file_size BIGINT,
  record_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- Recreate dependent tables
CREATE TABLE IF NOT EXISTS dataset_schema (
  id SERIAL PRIMARY KEY,
  dataset_id INTEGER REFERENCES datasets(id),
  schema_definition JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingestion_logs (
  id SERIAL PRIMARY KEY,
  dataset_id INTEGER REFERENCES datasets(id),
  status VARCHAR(50),
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lakehouse_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lakehouse_user;
