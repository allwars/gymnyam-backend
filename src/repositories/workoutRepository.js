const { getDb, runTransaction } = require('../db/database');
const analytics = require('./analyticsRepository');

function saveWorkout(data) {
  return runTransaction(() => {
    const db = getDb();
    const warmup = typeof data.warmup === 'string' ? data.warmup : JSON.stringify(data.warmup || []);
    const exercises = typeof data.exercises === 'string' ? data.exercises : JSON.stringify(data.exercises || []);
    const stretching = typeof data.stretching === 'string' ? data.stretching : JSON.stringify(data.stretching || []);
    const result = db.prepare(
      'INSERT INTO workouts (user_id, sport, warmup, exercises, stretching, summary, notes, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(data.user_id, data.sport || null, warmup, exercises, stretching, data.summary || null, data.notes || null, data.date || new Date().toISOString().split('T')[0]);
    try {
      if (data.sport) analytics.incrementSport(data.sport);
      const exArr = Array.isArray(data.exercises) ? data.exercises : JSON.parse(exercises);
      for (const ex of exArr) { if (ex.name) analytics.incrementExercise(ex.name); }
    } catch (_) {}
    return getWorkoutById(result.lastInsertRowid);
  });
}

function getWorkoutById(id) {
  const w = getDb().prepare('SELECT * FROM workouts WHERE id = ?').get(id);
  return w ? parseWorkout(w) : null;
}

function getWorkoutsByUser(userId, limit) {
  limit = limit || 20;
  return getDb().prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ?').all(userId, limit).map(parseWorkout);
}

function deleteWorkout(id, userId) {
  return getDb().prepare('DELETE FROM workouts WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
}

function updateWorkout(id, userId, data) {
  return runTransaction(() => {
    const db = getDb();
    const sets = [];
    const values = [];
    if (data.exercises !== undefined) { sets.push('exercises = ?'); values.push(typeof data.exercises === 'string' ? data.exercises : JSON.stringify(data.exercises)); }
    if (data.warmup !== undefined) { sets.push('warmup = ?'); values.push(typeof data.warmup === 'string' ? data.warmup : JSON.stringify(data.warmup)); }
    if (data.stretching !== undefined) { sets.push('stretching = ?'); values.push(typeof data.stretching === 'string' ? data.stretching : JSON.stringify(data.stretching)); }
    if (data.notes !== undefined) { sets.push('notes = ?'); values.push(data.notes); }
    if (!sets.length) return getWorkoutById(id);
    db.prepare('UPDATE workouts SET ' + sets.join(', ') + ' WHERE id = ? AND user_id = ?').run(...values, id, userId);
    return getWorkoutById(id);
  });
}

function parseWorkout(w) {
  return Object.assign({}, w, {
    warmup: tryParse(w.warmup, []),
    exercises: tryParse(w.exercises, []),
    stretching: tryParse(w.stretching, []),
  });
}

function tryParse(val, fallback) {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch (_) { return fallback; }
}

module.exports = { saveWorkout, getWorkoutById, getWorkoutsByUser, deleteWorkout, updateWorkout };
