const { suggestMeal, analyzeExternalMeal, analyzePantry, suggestDishes } = require('../agents/dietitianAgent');
const mealRepo = require('../repositories/mealRepository');
const pantryRepo = require('../repositories/pantryRepository');
const workoutRepo = require('../repositories/workoutRepository');
const userRepo = require('../repositories/userRepository');

/**
 * Genera una clave canónica para un nombre de plato:
 * - minúsculas + sin acentos
 * - elimina stopwords de relleno ("con", "y", "de", "al", ...)
 * - ordena las palabras restantes alfabéticamente
 *
 * Así "arroz con aguacate" y "aguacate con arroz" producen la misma clave
 * y se identifican como duplicados.
 */
const STOP = new Set(['con','y','de','del','al','a','la','el','los','las','en','sin','o','u','e','un','una','unos','unas']);

function dishKey(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP.has(w))
    .sort()
    .join('|');
}

/**
 * Elimina platos con el mismo nombre canónico dentro de un array.
 * Conserva el primero que aparece.
 */
function deduplicateDishes(dishes) {
  const seen = new Set();
  return dishes.filter(d => {
    const k = dishKey(d.name);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function getCurrentMealTime() {
  const hour = new Date().getHours();
  if (hour < 10) return 'desayuno';
  if (hour < 12) return 'media_manana';
  if (hour < 15) return 'almuerzo';
  if (hour < 18) return 'merienda';
  return 'cena';
}

/**
 * Construye el contexto de entrenamiento enriquecido para el dietista.
 * En lugar de pasar solo { sport: 'CrossFit' }, pasa tipo de WOD,
 * duración estimada e intensidad — el dietista ajusta macros en consecuencia.
 */
function buildWorkoutContext(workouts) {
  if (!workouts || !workouts.length) return null;
  return workouts.map(w => ({
    sport:              w.sport || 'CrossFit',
    wod_type:           w.wod_type || null,      // AMRAP | EMOM | For Time | Chipper | Strength+WOD
    wod_format:         w.wod_format || null,
    estimated_duration: w.estimated_duration || null,
    difficulty:         w.difficulty || null,    // Principiante | Intermedio | Avanzado
    // Indica al dietista si fue un día de fuerza (más proteína) o metcon (más carbos)
    session_focus:      w.strength_block && !w.wod ? 'strength' : w.wod_type === 'EMOM' ? 'skill' : 'metcon',
  }));
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
    const todayWorkouts = all.filter(w => String(w.date).split('T')[0] === today);
    workoutContext = buildWorkoutContext(todayWorkouts);
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
    const todayWorkouts = all.filter(w => String(w.date).split('T')[0] === today);
    workoutContext = buildWorkoutContext(todayWorkouts);
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

async function getDishSuggestions({ userId, mealTime, selectedIngredients }) {
  const user = await userRepo.getUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');
  const allPantry = await pantryRepo.getPantryByUser(userId);
  // Si el usuario seleccionó ingredientes específicos, filtrar la despensa
  const pantry = (selectedIngredients && selectedIngredients.length > 0)
    ? allPantry.filter(function(item) { return selectedIngredients.includes(item.name); })
    : allPantry;
  const mealHistory = await mealRepo.getMealsByUser(userId, 10);
  let workoutContext = null;
  if (user.synergy_enabled) {
    const today = new Date().toISOString().split('T')[0];
    const all = await workoutRepo.getWorkoutsByUser(userId, 5);
    workoutContext = buildWorkoutContext(all.filter(w => String(w.date).split('T')[0] === today));
  }
  const mt = mealTime || getCurrentMealTime();
  const result = await suggestDishes({ user, mealTime: mt, pantry, mealHistory, synergy: !!user.synergy_enabled, workoutContext });
  const dishes = deduplicateDishes(result.dishes || []);
  return { dishes, mealTime: mt };
}

async function confirmDish({ userId, mealTime, dish }) {
  const mt = mealTime || getCurrentMealTime();
  return mealRepo.saveMeal({ user_id: userId, meal_time: mt, type: 'suggestion', foods: dish.ingredients || [], nutritional_info: dish.nutritional_info || {}, advice: (dish.name || '') + (dish.description ? ' · ' + dish.description : ''), score: dish.score || null });
}

module.exports = { suggest, analyzeExternal, getPantryAnalysis, getHistory, getDishSuggestions, confirmDish };
