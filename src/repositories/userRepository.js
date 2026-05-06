const { getDb, runTransaction } = require('../db/database');

function createUser(data) {
  return runTransaction(() => {
    const db = getDb();
    const stmt = db.prepare(
      'INSERT INTO users (name, email, age, sex, weight, height, goal, sleep_hours, injuries, allergies, diet_type, diet_fasting_window, diet_fasting_start, diet_phase, diet_blood_type) VALUES (@name, @email, @age, @sex, @weight, @height, @goal, @sleep_hours, @injuries, @allergies, @diet_type, @diet_fasting_window, @diet_fasting_start, @diet_phase, @diet_blood_type)'
    );
    const result = stmt.run({
      name: data.name,
      email: data.email,
      age: data.age || null,
      sex: data.sex || null,
      weight: data.weight || null,
      height: data.height || null,
      goal: data.goal || null,
      sleep_hours: data.sleep_hours || null,
      injuries: data.injuries || null,
      allergies: data.allergies || null,
      diet_type: data.diet_type || null,
      diet_fasting_window: data.diet_fasting_window || null,
      diet_fasting_start: data.diet_fasting_start || null,
      diet_phase: data.diet_phase || null,
      diet_blood_type: data.diet_blood_type || null,
    });
    return getUserById(result.lastInsertRowid);
  });
}

function getUserById(id) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return null;
  user.sports = db.prepare('SELECT * FROM sports WHERE user_id = ?').all(id);
  return user;
}

function getUserByEmail(email) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return null;
  user.sports = db.prepare('SELECT * FROM sports WHERE user_id = ?').all(user.id);
  return user;
}

function updateSynergy(userId, enabled) {
  return runTransaction(() => {
    getDb().prepare('UPDATE users SET synergy_enabled = ? WHERE id = ?').run(enabled ? 1 : 0, userId);
    return getUserById(userId);
  });
}

function addSport(userId, sport) {
  return runTransaction(() => {
    const db = getDb();
    const result = db.prepare('INSERT INTO sports (user_id, name, level, schedule) VALUES (?, ?, ?, ?)').run(userId, sport.name, sport.level || null, sport.schedule || null);
    return db.prepare('SELECT * FROM sports WHERE id = ?').get(result.lastInsertRowid);
  });
}

function updateSports(userId, sports) {
  return runTransaction(() => {
    const db = getDb();
    db.prepare('DELETE FROM sports WHERE user_id = ?').run(userId);
    for (const s of sports) {
      db.prepare('INSERT INTO sports (user_id, name, level, schedule) VALUES (?, ?, ?, ?)').run(userId, s.name, s.level || null, s.schedule || null);
    }
    return getUserById(userId);
  });
}

function updateGoal(userId, goal) {
  return runTransaction(() => {
    getDb().prepare('UPDATE users SET goal = ? WHERE id = ?').run(goal, userId);
    return getUserById(userId);
  });
}

function updateProfile(userId, data) {
  const allowed = ['name','age','sex','weight','height','goal','sleep_hours','injuries','allergies','diet_type','diet_fasting_window','diet_fasting_start','diet_phase','diet_blood_type'];
  const entries = Object.entries(data).filter(([k, v]) => allowed.includes(k) && v !== undefined);
  if (!entries.length) return getUserById(userId);
  return runTransaction(() => {
    const db = getDb();
    const sets = entries.map(([k]) => k + ' = ?').join(', ');
    const values = entries.map(([, v]) => v);
    db.prepare('UPDATE users SET ' + sets + ' WHERE id = ?').run(...values, userId);
    return getUserById(userId);
  });
}

function updateDiet(userId, dietData) {
  const allowed = ['diet_type','diet_fasting_window','diet_fasting_start','diet_phase','diet_blood_type'];
  const entries = Object.entries(dietData).filter(([k, v]) => allowed.includes(k) && v !== undefined);
  if (!entries.length) return getUserById(userId);
  return runTransaction(() => {
    const db = getDb();
    const sets = entries.map(([k]) => k + ' = ?').join(', ');
    const values = entries.map(([, v]) => v);
    db.prepare('UPDATE users SET ' + sets + ' WHERE id = ?').run(...values, userId);
    return getUserById(userId);
  });
}

module.exports = { createUser, getUserById, getUserByEmail, updateSynergy, addSport, updateSports, updateGoal, updateProfile, updateDiet };
