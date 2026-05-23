const supabase = require('../db/supabase');

function calcAgeFromBirthDate(dateStr) {
  const bd = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age;
}

async function createUser(data) {
  const age = data.birth_date ? calcAgeFromBirthDate(data.birth_date) : (data.age || null);
  const { data: user, error } = await supabase
    .from('users')
    .insert({
      name: data.name,
      email: data.email,
      birth_date: data.birth_date || null,
      age,
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
    })
    .select().single();
  if (error) throw new Error(error.message);
  return user;
}

async function getUserById(id) {
  const { data: user, error } = await supabase
    .from('users').select('*, sports(*)').eq('id', id).single();
  if (error || !user) return null;
  // Derive age from birth_date if age column is null/stale
  if (user.birth_date && !user.age) {
    user.age = calcAgeFromBirthDate(user.birth_date);
  }
  return user;
}

async function getUserByEmail(email) {
  const { data: user, error } = await supabase
    .from('users').select('*, sports(*)').eq('email', email).single();
  if (error || !user) return null;
  return user;
}

async function updateSynergy(userId, enabled) {
  const { data, error } = await supabase
    .from('users').update({ synergy_enabled: enabled ? 1 : 0 }).eq('id', userId).select('*, sports(*)').single();
  if (error) throw new Error(error.message);
  return data;
}

async function addSport(userId, sport) {
  const { data, error } = await supabase
    .from('sports').insert({ user_id: userId, name: sport.name, level: sport.level || null, schedule: sport.schedule || null })
    .select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateSports(userId, sports) {
  await supabase.from('sports').delete().eq('user_id', userId);
  if (sports.length > 0) {
    const { error } = await supabase.from('sports').insert(
      sports.map(s => ({ user_id: userId, name: s.name, level: s.level || 'Intermedio', schedule: s.schedule || null }))
    );
    if (error) throw new Error(error.message);
  }
  return getUserById(userId);
}

async function updateGoal(userId, goal) {
  const { data, error } = await supabase
    .from('users').update({ goal }).eq('id', userId).select('*, sports(*)').single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateProfile(userId, data) {
  const allowed = ['name','age','sex','birth_date','weight','height','goal','sleep_hours','injuries','allergies','health_data','webhook_token'];
  const update = Object.fromEntries(Object.entries(data).filter(([k, v]) => allowed.includes(k) && v !== undefined));
  // Keep age in sync when birth_date is updated
  if (update.birth_date) update.age = calcAgeFromBirthDate(update.birth_date);
  if (!Object.keys(update).length) return getUserById(userId);
  const { data: user, error } = await supabase
    .from('users').update(update).eq('id', userId).select('*, sports(*)').single();
  if (error) throw new Error(error.message);
  return user;
}

async function deleteUser(userId) {
  // Borrar datos relacionados primero
  await supabase.from('sports').delete().eq('user_id', userId);
  await supabase.from('meals').delete().eq('user_id', userId);
  await supabase.from('workouts').delete().eq('user_id', userId);
  await supabase.from('pantry_items').delete().eq('user_id', userId);
  // Borrar usuario
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) throw new Error(error.message);
  return true;
}

async function updateDiet(userId, dietData) {
  const allowed = ['diet_type','diet_fasting_window','diet_fasting_start','diet_phase','diet_blood_type'];
  const update = Object.fromEntries(Object.entries(dietData).filter(([k, v]) => allowed.includes(k) && v !== undefined));
  if (!Object.keys(update).length) return getUserById(userId);
  const { data: user, error } = await supabase
    .from('users').update(update).eq('id', userId).select('*, sports(*)').single();
  if (error) throw new Error(error.message);
  return user;
}

async function getHealthImports(userId, limit = 20) {
  const { data, error } = await supabase
    .from('health_imports')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

module.exports = { createUser, getUserById, getUserByEmail, updateSynergy, addSport, updateSports, updateGoal, updateProfile, updateDiet, deleteUser, getHealthImports };
