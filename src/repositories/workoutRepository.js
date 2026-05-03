const supabase = require('../db/supabase');

async function saveWorkout(data) {
  const { data: workout, error } = await supabase
    .from('workouts')
    .insert({
      user_id: data.user_id,
      sport: data.sport,
      warmup: data.warmup || [],
      exercises: data.exercises || [],
      stretching: data.stretching || [],
      summary: data.summary,
      notes: data.notes,
      date: data.date || new Date().toISOString().split('T')[0],
    })
    .select().single();
  if (error) throw new Error(error.message);
  return workout;
}

async function getWorkoutById(id) {
  const { data, error } = await supabase
    .from('workouts').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data;
}

async function getWorkoutsByUser(userId, limit = 20) {
  const { data, error } = await supabase
    .from('workouts').select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

async function deleteWorkout(id, userId) {
  const { error } = await supabase
    .from('workouts').delete()
    .eq('id', id).eq('user_id', userId);
  return !error;
}

async function updateWorkout(id, userId, data) {
  const update = {};
  if (data.exercises !== undefined) update.exercises = data.exercises;
  if (data.warmup !== undefined) update.warmup = data.warmup;
  if (data.stretching !== undefined) update.stretching = data.stretching;
  if (data.notes !== undefined) update.notes = data.notes;
  if (!Object.keys(update).length) return getWorkoutById(id);
  const { error } = await supabase.from('workouts').update(update).eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
  return getWorkoutById(id);
}

module.exports = { saveWorkout, getWorkoutById, getWorkoutsByUser, deleteWorkout, updateWorkout };
