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
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 10000');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
    db.pragma('wal_autocheckpoint = 1000');
    initSchema();
  }
  return db;
}

function runTransaction(fn) {
  return getDb().transaction(fn)();
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
      diet_type TEXT DEFAULT NULL,
      diet_fasting_window TEXT DEFAULT NULL,
      diet_fasting_start TEXT DEFAULT NULL,
      diet_phase TEXT DEFAULT NULL,
      diet_blood_type TEXT DEFAULT NULL,
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
    CREATE TABLE IF NOT EXISTS diet_stats (
      diet_type TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sport_stats (
      sport_name TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS exercise_stats (
      exercise_name TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS food_stats (
      food_name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('protein','fat','carb','sugar','other')),
      count INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (food_name, category)
    );
  `);

  const existingCols = db.pragma('table_info(users)').map(c => c.name);
  const newCols = [
    { name: 'diet_type',           def: 'TEXT DEFAULT NULL' },
    { name: 'diet_fasting_window', def: 'TEXT DEFAULT NULL' },
    { name: 'diet_fasting_start',  def: 'TEXT DEFAULT NULL' },
    { name: 'diet_phase',          def: 'TEXT DEFAULT NULL' },
    { name: 'diet_blood_type',     def: 'TEXT DEFAULT NULL' },
  ];
  for (const col of newCols) {
    if (!existingCols.includes(col.name)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`);
    }
  }
}

module.exports = { getDb, runTransaction };
