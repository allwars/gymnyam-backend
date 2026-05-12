const { generateWorkout } = require('../agents/trainerAgent');
const workoutRepo = require('../repositories/workoutRepository');
const mealRepo = require('../repositories/mealRepository');
const userRepo = require('../repositories/userRepository');

// Dietas con restricción calórica severa — no compatibles con WODs de alta intensidad
const RESTRICTIVE_DIETS = {
  hcg:      { calorie_limit: 500,  label: 'HCG' },
  military: { calorie_limit: 1000, label: 'Dieta Militar' },
  egg_diet: { calorie_limit: 800,  label: 'Dieta del Huevo' },
  omad:     { fasting: true,       label: 'OMAD' },
  '5_2':    { fasting: true,       label: '5:2' },
  cabbage_soup: { calorie_limit: 900, label: 'Dieta de la Sopa' },
};

/**
 * Devuelve una advertencia de seguridad si la dieta del usuario
 * es incompatible con un WOD de alta intensidad.
 * @returns {string|null}
 */
function getDietSafetyWarning(user) {
  const diet = RESTRICTIVE_DIETS[user.diet_type];
  if (!diet) return null;
  if (diet.calorie_limit) {
    return `⚠️ AVISO DE SEGURIDAD: Estás siguiendo la ${diet.label} (~${diet.calorie_limit} kcal/día). ` +
      `Evita WODs de alta intensidad. Si sientes mareo, detente y come algo.`;
  }
  if (diet.fasting) {
    return `⚠️ AVISO DE SEGURIDAD: Estás en ${diet.label} (ayuno activo). ` +
      `Si este entreno cae dentro de tu ventana de ayuno, reduce la intensidad y mantente bien hidratado.`;
  }
  return null;
}

async function generateAndSave({ userId, level, checkin }) {
  const user = await userRepo.getUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');

  // CrossFit: nivel desde parámetro (frontend), tabla sports, campo level, o defecto Intermedio
  const levelFromParam  = level || null;
  const levelFromSports = user.sports?.find(s => s.name === 'CrossFit')?.level || null;
  const levelFromUser   = user.level || null;
  const resolvedLevel   = levelFromParam || levelFromSports || levelFromUser || 'Intermedio';

  // Aviso en logs cuando usamos el fallback — ayuda a detectar el bug de Supabase sports.level=null
  if (!levelFromParam && !levelFromSports && !levelFromUser) {
    console.warn(`[workoutService] userId=${userId} — nivel no encontrado en param/sports/user → fallback a 'Intermedio'. Revisar columna level en tabla sports.`);
  }

  const history = await workoutRepo.getWorkoutsByUser(userId, 5);
  let mealContext = null;
  if (user.synergy_enabled) {
    const today = new Date().toISOString().split('T')[0];
    const allMeals = await mealRepo.getMealsByUser(userId, 10);
    mealContext = allMeals.filter(m => m.date && m.date.toString().split('T')[0] === today);
  }

  let plan;
  try {
    plan = await generateWorkout({
      user,
      history,
      level: resolvedLevel,
      synergy: !!user.synergy_enabled,
      mealContext,
      checkin: checkin || null,
    });
  } catch (e) {
    throw new Error(`Error generando WOD con IA: ${e.message}`);
  }

  // Garantizar time_cap en WODs que lo requieren (defensa ante respuestas incompletas de la IA)
  const TIME_CAP_REQUIRED = ['For Time', 'Chipper', 'Hero WOD'];
  if (plan.wod && TIME_CAP_REQUIRED.includes(plan.wod.type) && !plan.wod.time_cap) {
    plan.wod.time_cap = '20 min';
    console.warn(`[workoutService] userId=${userId} — time_cap añadido por defecto en WOD tipo '${plan.wod.type}'`);
  }

  // Guardar el WOD completo: exercises contiene los movimientos del WOD
  const wodMovements = plan.wod?.movements || plan.exercises || [];
  const saved = await workoutRepo.saveWorkout({
    user_id: userId,
    sport: 'CrossFit',
    warmup: plan.warmup,
    exercises: wodMovements,
    stretching: plan.stretching,
    summary: plan.summary,
    difficulty: resolvedLevel,
    notes: null,
    // Campos extra del WOD (guardamos el plan completo en notes_json si el repo lo soporta)
    wod_type: plan.wod_type,
    wod_format: plan.wod_format,
    wod: plan.wod,
    strength_block: plan.strength_block,
    ai_coaching_tip: plan.ai_coaching_tip,
  });

  const dietWarning = getDietSafetyWarning(user);

  return {
    ...saved,
    difficulty: resolvedLevel,
    wod_type: plan.wod_type,
    wod_format: plan.wod_format,
    wod: plan.wod,
    strength_block: plan.strength_block,
    ai_coaching_tip: plan.ai_coaching_tip,
    warmup: plan.warmup,
    stretching: plan.stretching,
    summary: plan.summary,
    // null si la dieta del usuario es compatible; string de advertencia si no lo es
    diet_safety_warning: dietWarning,
  };
}

async function getHistory(userId, limit) { return workoutRepo.getWorkoutsByUser(userId, limit); }
async function saveNotes(workoutId, userId, notes) { return workoutRepo.updateWorkout(workoutId, userId, { notes }); }
async function updateWorkout(workoutId, userId, data) { return workoutRepo.updateWorkout(workoutId, userId, data); }

module.exports = { generateAndSave, getHistory, saveNotes, updateWorkout };
