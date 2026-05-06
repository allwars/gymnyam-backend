const supabase = require('../db/supabase');

async function createUser(data) {
  const { data: user, error } = await supabase
    .from('users')
    .insert({
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
    })
    .select().single();
  if (error) throw new Error(error.message);
  return user;
}

async function getUserById(id) {
  const { data: user, error } = await supabase
    .from('users').select('*, sports(*)').eq('id', id).single();
  if (error || !user) return null;
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
    .from('users').update({ synergy_enabled: enabled }).eq('id', userId).select('*, sports(*)').single();
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
      sports.map(s => ({ user_id: userId, name: s.name, level: s.level || null, schedule: s.schedule || null }))
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
  const allowed = ['name','age','sex','weight','height','goal','sleep_hours','injuries','allergies'];
  const update = Object.fromEntries(Object.entries(data).filter(([k, v]) => allowed.includes(k) && v !== undefined));
  if (!Object.keys(update).length) return getUserById(userId);
  const { data: user, error } = await supabase
    .from('users').update(update).eq('id', userId).select('*, sports(*)').single();
  if (error) throw new Error(error.message);
  return user;
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

module.exports = { createUser, getUserById, getUserByEmail, updateSynergy, addSport, updateSports, updateGoal, updateProfile, updateDiet };
