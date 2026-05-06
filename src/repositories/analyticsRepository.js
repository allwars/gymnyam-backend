const supabase = require('../db/supabase');

function classifyFood(food) {
  const name = (food.name || '').toLowerCase();
  const p = food.protein || food.protein_per_100g || 0;
  const f = food.fat || food.fat_per_100g || 0;
  const c = food.carbs || food.carbs_per_100g || 0;
  const s = food.sugar || food.sugar_per_100g || 0;
  if (s > 10) return 'sugar';
  if (p >= f && p >= c) return 'protein';
  if (f >= p && f >= c) return 'fat';
  if (c >= p && c >= f) return 'carb';
  return 'other';
}

async function upsertCounter(table, keyCol, keyVal, extra = {}) {
  try {
    const { data } = await supabase.from(table).select('count').eq(keyCol, keyVal).single();
    if (data) {
      await supabase.from(table).update({ count: data.count + 1 }).eq(keyCol, keyVal);
    } else {
      await supabase.from(table).insert({ [keyCol]: keyVal, count: 1, ...extra });
    }
  } catch (_) {}
}

async function decrementCounter(table, keyCol, keyVal) {
  try {
    const { data } = await supabase.from(table).select('count').eq(keyCol, keyVal).single();
    if (data && data.count > 0) {
      await supabase.from(table).update({ count: data.count - 1 }).eq(keyCol, keyVal);
    }
  } catch (_) {}
}

function incrementDiet(dietType) { return upsertCounter('diet_stats', 'diet_type', dietType); }
function decrementDiet(dietType) { return decrementCounter('diet_stats', 'diet_type', dietType); }
function incrementSport(sport) { return upsertCounter('sport_stats', 'sport_name', sport); }
function incrementExercise(exercise) { return upsertCounter('exercise_stats', 'exercise_name', exercise); }

function incrementFoods(foods) {
  if (!Array.isArray(foods)) return;
  for (const food of foods) {
    if (!food.name) continue;
    const category = classifyFood(food);
    try {
      supabase.from('food_stats').select('count').eq('food_name', food.name).eq('category', category).single()
        .then(({ data }) => {
          if (data) {
            supabase.from('food_stats').update({ count: data.count + 1 }).eq('food_name', food.name).eq('category', category);
          } else {
            supabase.from('food_stats').insert({ food_name: food.name, category, count: 1 });
          }
        });
    } catch (_) {}
  }
}

async function getAllStats() {
  const [diets, sports, exercises, foods] = await Promise.all([
    supabase.from('diet_stats').select('*').order('count', { ascending: false }).limit(10),
    supabase.from('sport_stats').select('*').order('count', { ascending: false }).limit(10),
    supabase.from('exercise_stats').select('*').order('count', { ascending: false }).limit(10),
    supabase.from('food_stats').select('*').order('count', { ascending: false }).limit(40),
  ]);
  return {
    diets: diets.data || [],
    sports: sports.data || [],
    exercises: exercises.data || [],
    foods: foods.data || [],
  };
}

module.exports = { incrementDiet, decrementDiet, incrementSport, incrementExercise, incrementFoods, getAllStats, classifyFood };
