const { getDb, runTransaction } = require('../db/database');

function addItem(data) {
  return runTransaction(() => {
    const db = getDb();
    const ni = typeof data.nutritional_info === 'string' ? data.nutritional_info : JSON.stringify(data.nutritional_info || {});
    const result = db.prepare(
      'INSERT INTO pantry (user_id, name, quantity, nutritional_info, added_by) VALUES (?, ?, ?, ?, ?)'
    ).run(data.user_id, data.name, data.quantity || null, ni, data.added_by || 'manual');
    return getItemById(result.lastInsertRowid);
  });
}

function getItemById(id) {
  const item = getDb().prepare('SELECT * FROM pantry WHERE id = ?').get(id);
  return item ? parseItem(item) : null;
}

function getPantryByUser(userId) {
  return getDb().prepare('SELECT * FROM pantry WHERE user_id = ? ORDER BY name ASC').all(userId).map(parseItem);
}

function deleteItem(id, userId) {
  return getDb().prepare('DELETE FROM pantry WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
}

function updateItem(id, userId, data) {
  return runTransaction(() => {
    const sets = [];
    const values = [];
    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
    if (data.quantity !== undefined) { sets.push('quantity = ?'); values.push(data.quantity); }
    if (data.nutritional_info !== undefined) {
      sets.push('nutritional_info = ?');
      values.push(typeof data.nutritional_info === 'string' ? data.nutritional_info : JSON.stringify(data.nutritional_info));
    }
    if (!sets.length) return getItemById(id);
    getDb().prepare('UPDATE pantry SET ' + sets.join(', ') + ' WHERE id = ? AND user_id = ?').run(...values, id, userId);
    return getItemById(id);
  });
}

function parseItem(item) {
  return Object.assign({}, item, {
    nutritional_info: tryParse(item.nutritional_info, {}),
  });
}

function tryParse(val, fallback) {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch (_) { return fallback; }
}

module.exports = { addItem, getItemById, getPantryByUser, deleteItem, updateItem };
