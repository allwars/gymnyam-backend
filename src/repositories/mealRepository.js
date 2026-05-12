const supabase = require('../db/supabase');
const analytics = require('./analyticsRepository');

async function saveMeal(data) {
  const { data: meal, error } = await supabase
    .from('meals')
    .insert({
      user_id: data.user_id,
      meal_time: data.meal_time,
      type: data.type,
      foods: data.foods || [],
      nutritional_info: data.nutritional_info || {},
      advice: data.advice || null,
      score: data.score || null,
      date: data.date || new Date().toISOString().split('T')[0],
    })
    .select().single();
  if (error) throw new Error(error.message);
  try {
    const foodsArr = Array.isArray(data.foods) ? data.foods : [];
    analytics.incrementFoods(foodsArr);
  } catch (_) {}
  return meal;
}

async function getMealById(id) {
  const { data, error } = await supabase.from('meals').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data;
}

async function getMealsByUser(userId, limit = 30) {
  const { data, error } = await supabase
    .from('meals').select('*').eq('user_id', userId)
    .order('date', { ascending: false }).order('id', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

async function deleteMeal(id, userId) {
  await supabase.from('meals').delete().eq('id', id).eq('user_id', userId);
}

async function updateMeal(id, userId, data) {
  const update = {};
  if (data.meal_time !== undefined) update.meal_time = data.meal_time;
  if (data.advice !== undefined) update.advice = data.advice;
  if (data.foods !== undefined) {
    // Normalizar: kcal y protein vacíos → null; nombre siempre string
    update.foods = data.foods
      .filter(f => f.name?.trim())
      .map(f => ({
        ...f,
        name: String(f.name).trim(),
        quantity: f.quantity ? String(f.quantity).trim() : null,
        calories: f.calories !== '' && f.calories != null ? Number(f.calories) || null : null,
        protein:  f.protein  !== '' && f.protein  != null ? Number(f.protein)  || null : null,
      }));
  }
  if (!Object.keys(update).length) return getMealById(id);
  const { data: meal, error } = await supabase
    .from('meals').update(update).eq('id', id).eq('user_id', userId).select().single();
  if (error) throw new Error(error.message);
  return meal;
}

module.exports = { saveMeal, getMealById, getMealsByUser, deleteMeal, updateMeal };
