CREATE TABLE IF NOT EXISTS journal_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_date TEXT NOT NULL,
  event_time TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('meal', 'drink', 'symptom', 'checkin')),
  title TEXT NOT NULL,
  details TEXT,
  rating INTEGER,
  quantity_ml INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journal_events_date_time
  ON journal_events (event_date, event_time);

CREATE TABLE IF NOT EXISTS drink_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL,
  default_quantity_ml INTEGER NOT NULL
);

INSERT OR IGNORE INTO drink_options (name, emoji, default_quantity_ml) VALUES
  ('Water', '💧', 250),
  ('Black Tea', '☕', 300),
  ('Rooibos', '🫖', 300),
  ('Coffee', '☕', 250);
