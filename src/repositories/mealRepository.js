const { getDb, runTransaction } = require('../db/database');
const analytics = require('./analyticsRepository');

function saveMeal(data) {
  return runTransaction(() => {
    const db = getDb();
    const foods = typeof data.foods === 'string' ? data.foods : JSON.stringify(data.foods || []);
    const ni = typeof data.nutritional_info === 'string' ? data.nutritional_info : JSON.stringify(data.nutritional_info || {});
    const result = db.prepare(
      'INSERT INTO meals (user_id, meal_time, type, foods, nutritional_info, advice, score, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(data.user_id, data.meal_time, data.type, foods, ni, data.advice || null, data.score || null, data.date || new Date().toISOString().split('T')[0]);
    try {
      const foodsArr = Array.isArray(data.foods) ? data.foods : JSON.parse(foods);
      analytics.incrementFoods(foodsArr);
    } catch (_) {}
    return getMealById(result.lastInsertRowid);
  });
}

function getMealById(id) {
  const meal = getDb().prepare('SELECT * FROM meals WHERE id = ?').get(id);
  return meal ? parseMeal(meal) : null;
}

function getMealsByUser(userId, limit) {
  limit = limit || 30;
  return getDb().prepare('SELECT * FROM meals WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ?').all(userId, limit).map(parseMeal);
}

function deleteMeal(id, userId) {
  return getDb().prepare('DELETE FROM meals WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
}

function updateMeal(id, userId, data) {
  return runTransaction(() => {
    const sets = [];
    const values = [];
    if (data.meal_time !== undefined) { sets.push('meal_time = ?'); values.push(data.meal_time); }
    if (data.advice !== undefined) { sets.push('advice = ?'); values.push(data.advice); }
    if (!sets.length) return getMealById(id);
    getDb().prepare('UPDATE meals SET ' + sets.join(', ') + ' WHERE id = ? AND user_id = ?').run(...values, id, userId);
    return getMealById(id);
  });
}

function parseMeal(meal) {
  return Object.assign({}, meal, {
    foods: tryParse(meal.foods, []),
    nutritional_info: tryParse(meal.nutritional_info, {}),
  });
}

function tryParse(val, fallback) {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch (_) { return fallback; }
}

module.exports = { saveMeal, getMealById, getMealsByUser, deleteMeal, updateMeal };
