const { suggestMeal, analyzeExternalMeal, analyzePantry, suggestDishes } = require('../agents/dietitianAgent');
const mealRepo = require('../repositories/mealRepository');
const pantryRepo = require('../repositories/pantryRepository');
const workoutRepo = require('../repositories/workoutRepository');
const userRepo = require('../repositories/userRepository');

function getCurrentMealTime() {
  const hour = new Date().getHours();
  if (hour < 10) return 'desayuno';
  if (hour < 12) return 'media_manana';
  if (hour < 15) return 'almuerzo';
  if (hour < 18) return 'merienda';
  return 'cena';
}

async function suggest({ userId, mealTime }) {
  const user = await userRepo.getUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');
  const pantry = await pantryRepo.getPantryByUser(userId);
  const mealHistory = await mealRepo.getMealsByUser(userId, 10);
  let workoutContext = null;
  if (user.synergy_enabled) {
    const today = new Date().toISOString().split('T')[0];
    const all = await workoutRepo.getWorkoutsByUser(userId, 5);
    workoutContext = all.filter(w => String(w.date).split('T')[0] === today);
  }
  const mt = mealTime || getCurrentMealTime();
  const suggestion = await suggestMeal({ user, mealTime: mt, pantry, mealHistory, synergy: !!user.synergy_enabled, workoutContext });
  return mealRepo.saveMeal({ user_id: userId, meal_time: mt, type: 'suggestion', foods: suggestion.foods, nutritional_info: suggestion.nutritional_info, advice: suggestion.advice, score: suggestion.score });
}

async function analyzeExternal({ userId, description, mealTime }) {
  const user = await userRepo.getUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');
  let workoutContext = null;
  if (user.synergy_enabled) {
    const today = new Date().toISOString().split('T')[0];
    const all = await workoutRepo.getWorkoutsByUser(userId, 5);
    workoutContext = all.filter(w => String(w.date).split('T')[0] === today);
  }
  const mt = mealTime || getCurrentMealTime();
  const analysis = await analyzeExternalMeal({ user, description, synergy: !!user.synergy_enabled, workoutContext });
  return mealRepo.saveMeal({ user_id: userId, meal_time: mt, type: 'external', foods: analysis.foods, nutritional_info: analysis.nutritional_info, advice: analysis.advice, score: analysis.score });
}

async function getPantryAnalysis(userId) {
  const user = await userRepo.getUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');
  const pantry = await pantryRepo.getPantryByUser(userId);
  if (!pantry.length) throw new Error('Añade alimentos a tu despensa antes de analizarla.');
  const mealHistory = await mealRepo.getMealsByUser(userId, 20);
  return analyzePantry({ user, pantry, mealHistory });
}

async function getHistory(userId, limit) { return mealRepo.getMealsByUser(userId, limit); }

async function getDishSuggestions({ userId, mealTime }) {
  const user = await userRepo.getUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');
  const pantry = await pantryRepo.getPantryByUser(userId);
  const mealHistory = await mealRepo.getMealsByUser(userId, 10);
  let workoutContext = null;
  if (user.synergy_enabled) {
    const today = new Date().toISOString().split('T')[0];
    const all = await workoutRepo.getWorkoutsByUser(userId, 5);
    workoutContext = all.filter(w => String(w.date).split('T')[0] === today);
  }
  const mt = mealTime || getCurrentMealTime();
  const result = await suggestDishes({ user, mealTime: mt, pantry, mealHistory, synergy: !!user.synergy_enabled, workoutContext });
  return { dishes: result.dishes || [], mealTime: mt };
}

async function confirmDish({ userId, mealTime, dish }) {
  const mt = mealTime || getCurrentMealTime();
  return mealRepo.saveMeal({ user_id: userId, meal_time: mt, type: 'suggestion', foods: dish.ingredients || [], nutritional_info: dish.nutritional_info || {}, advice: (dish.name || '') + (dish.description ? ' · ' + dish.description : ''), score: dish.score || null });
}

module.exports = { suggest, analyzeExternal, getPantryAnalysis, getHistory, getDishSuggestions, confirmDish };
