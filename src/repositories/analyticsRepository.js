const { getDb, runTransaction } = require('../db/database');

// Clasifica un alimento en su categoría de macro dominante
function classifyFood(food) {
  const p = food.protein || 0;
  const f = food.fat || 0;
  const c = food.carbs || 0;
  const s = food.sugar || 0;

  // Si tiene mucho azúcar (>10g por porción o >30% de los carbos)
  if (s > 10 || (c > 0 && s / c > 0.3)) return 'sugar';
  const dominant = Math.max(p, f, c);
  if (dominant === 0) return 'other';
  if (dominant === p) return 'protein';
  if (dominant === f) return 'fat';
  return 'carb';
}

function incrementDiet(dietType) {
  if (!dietType) return;
  try {
    runTransaction(() => {
      const db = getDb();
      db.prepare(`
        INSERT INTO diet_stats (diet_type, count, updated_at)
        VALUES (?, 1, datetime('now'))
        ON CONFLICT(diet_type) DO UPDATE SET count = count + 1, updated_at = datetime('now')
      `).run(dietType);
    });
  } catch (e) { /* analytics no debe romper flujo principal */ }
}

function decrementDiet(dietType) {
  if (!dietType) return;
  try {
    runTransaction(() => {
      const db = getDb();
      db.prepare(`
        UPDATE diet_stats SET count = MAX(0, count - 1), updated_at = datetime('now')
        WHERE diet_type = ?
      `).run(dietType);
    });
  } catch (e) {}
}

function incrementSport(sportName) {
  if (!sportName) return;
  try {
    runTransaction(() => {
      const db = getDb();
      db.prepare(`
        INSERT INTO sport_stats (sport_name, count, updated_at)
        VALUES (?, 1, datetime('now'))
        ON CONFLICT(sport_name) DO UPDATE SET count = count + 1, updated_at = datetime('now')
      `).run(sportName.toLowerCase().trim());
    });
  } catch (e) {}
}

function incrementExercise(exerciseName) {
  if (!exerciseName) return;
  try {
    runTransaction(() => {
      const db = getDb();
      db.prepare(`
        INSERT INTO exercise_stats (exercise_name, count, updated_at)
        VALUES (?, 1, datetime('now'))
        ON CONFLICT(exercise_name) DO UPDATE SET count = count + 1, updated_at = datetime('now')
      `).run(exerciseName.toLowerCase().trim());
    });
  } catch (e) {}
}

function incrementFoods(foods) {
  if (!Array.isArray(foods) || !foods.length) return;
  try {
    runTransaction(() => {
      const db = getDb();
      const stmt = db.prepare(`
        INSERT INTO food_stats (food_name, category, count, updated_at)
        VALUES (?, ?, 1, datetime('now'))
        ON CONFLICT(food_name, category) DO UPDATE SET count = count + 1, updated_at = datetime('now')
      `);
      for (const food of foods) {
        if (!food.name) continue;
        const category = classifyFood(food);
        stmt.run(food.name.toLowerCase().trim(), category);
      }
    });
  } catch (e) {}
}

function getTopDiets(limit = 10) {
  return getDb().prepare('SELECT diet_type, count FROM diet_stats ORDER BY count DESC LIMIT ?').all(limit);
}

function getTopSports(limit = 10) {
  return getDb().prepare('SELECT sport_name, count FROM sport_stats ORDER BY count DESC LIMIT ?').all(limit);
}

function getTopExercises(limit = 10) {
  return getDb().prepare('SELECT exercise_name, count FROM exercise_stats ORDER BY count DESC LIMIT ?').all(limit);
}

function getTopFoodsByCategory(limit = 10) {
  const db = getDb();
  const categories = ['protein', 'fat', 'carb', 'sugar', 'other'];
  const result = {};
  for (const cat of categories) {
    result[cat] = db.prepare(
      'SELECT food_name, count FROM food_stats WHERE category = ? ORDER BY count DESC LIMIT ?'
    ).all(cat, limit);
  }
  return result;
}

function getAllStats() {
  return {
    diets: getTopDiets(15),
    sports: getTopSports(15),
    exercises: getTopExercises(15),
    foods: getTopFoodsByCategory(10),
  };
}

module.exports = {
  incrementDiet, decrementDiet,
  incrementSport, incrementExercise, incrementFoods,
  getTopDiets, getTopSports, getTopExercises, getTopFoodsByCategory, getAllStats,
};
