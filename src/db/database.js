const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/gymnyam.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    db = new Database(DB_PATH);
    // WAL mode: readers don't block writers, writers don't block readers
    db.pragma('journal_mode = WAL');
    // Wait up to 10s instead of failing immediately on lock
    db.pragma('busy_timeout = 10000');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
    // Reduce lock contention on Windows
    db.pragma('wal_autocheckpoint = 1000');
    initSchema();
  }
  return db;
}

// Wrap any write operation in a serialized transaction to avoid lock conflicts
function runTransaction(fn) {
  const db = getDb();
  return db.transaction(fn)();
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      age INTEGER,
      sex TEXT,
      weight REAL,
      height REAL,
      goal TEXT,
      sleep_hours REAL,
      injuries TEXT,
      allergies TEXT,
      synergy_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      level TEXT,
      schedule TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sport TEXT,
      warmup TEXT,
      exercises TEXT,
      stretching TEXT,
      summary TEXT,
      notes TEXT,
      date TEXT DEFAULT (date('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      meal_time TEXT,
      type TEXT,
      foods TEXT,
      nutritional_info TEXT,
      advice TEXT,
      score REAL,
      date TEXT DEFAULT (date('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS pantry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity TEXT,
      nutritional_info TEXT,
      added_by TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

module.exports = { getDb, runTransaction };
