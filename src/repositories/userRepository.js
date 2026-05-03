const supabase = require('../db/supabase');

async function createUser(data) {
  const { data: user, error } = await supabase
    .from('users')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return getUserById(user.id);
}

async function getUserById(id) {
  const { data: user, error } = await supabase
    .from('users').select('*').eq('id', id).single();
  if (error || !user) return null;
  const { data: sports } = await supabase
    .from('sports').select('*').eq('user_id', id);
  user.sports = sports || [];
  return user;
}

async function getUserByEmail(email) {
  const { data: user, error } = await supabase
    .from('users').select('*').eq('email', email).single();
  if (error || !user) return null;
  const { data: sports } = await supabase
    .from('sports').select('*').eq('user_id', user.id);
  user.sports = sports || [];
  return user;
}

async function updateSynergy(userId, enabled) {
  await supabase.from('users')
    .update({ synergy_enabled: enabled ? 1 : 0 }).eq('id', userId);
  return getUserById(userId);
}

async function addSport(userId, sport) {
  const { data, error } = await supabase
    .from('sports')
    .insert({ user_id: userId, name: sport.name, level: sport.level || null, schedule: sport.schedule || null })
    .select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateSports(userId, sports) {
  await supabase.from('sports').delete().eq('user_id', userId);
  if (sports.length > 0) {
    const rows = sports.map(s => ({
      user_id: userId,
      name: s.name,
      level: s.level || null,
      schedule: s.schedule || null,
    }));
    const { error } = await supabase.from('sports').insert(rows);
    if (error) throw new Error(error.message);
  }
  return getUserById(userId);
}

async function updateGoal(userId, goal) {
  await supabase.from('users').update({ goal }).eq('id', userId);
  return getUserById(userId);
}

async function updateProfile(userId, data) {
  const allowed = ['name', 'age', 'sex', 'weight', 'height', 'goal', 'sleep_hours', 'injuries', 'allergies'];
  const update = Object.fromEntries(Object.entries(data).filter(([k, v]) => allowed.includes(k) && v !== undefined));
  if (!Object.keys(update).length) return getUserById(userId);
  await supabase.from('users').update(update).eq('id', userId);
  return getUserById(userId);
}

module.exports = { createUser, getUserById, getUserByEmail, updateSynergy, addSport, updateSports, updateGoal, updateProfile };
