const supabase = require('../db/supabase');

async function saveMeal(data) {
  const { data: meal, error } = await supabase
    .from('meals')
    .insert({
      user_id: data.user_id,
      meal_time: data.meal_time,
      type: data.type,
      foods: data.foods || [],
      nutritional_info: data.nutritional_info || {},
      advice: data.advice,
      score: data.score,
      date: data.date || new Date().toISOString().split('T')[0],
    })
    .select().single();
  if (error) throw new Error(error.message);
  return meal;
}

async function getMealById(id) {
  const { data, error } = await supabase
    .from('meals').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data;
}

async function getMealsByUser(userId, limit = 30) {
  const { data, error } = await supabase
    .from('meals').select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

async function deleteMeal(id, userId) {
  const { error } = await supabase
    .from('meals').delete().eq('id', id).eq('user_id', userId);
  return !error;
}

async function updateMeal(id, userId, data) {
  const update = {};
  if (data.meal_time !== undefined) update.meal_time = data.meal_time;
  if (data.advice !== undefined) update.advice = data.advice;
  if (!Object.keys(update).length) return getMealById(id);
  await supabase.from('meals').update(update).eq('id', id).eq('user_id', userId);
  return getMealById(id);
}

module.exports = { saveMeal, getMealById, getMealsByUser, deleteMeal, updateMeal };
