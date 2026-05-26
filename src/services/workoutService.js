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

async function generateAndSave({ userId, level, checkin, sport }) {
  const user = await userRepo.getUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');

  // Deporte activo: viene del frontend; por defecto CrossFit para compatibilidad
  const activeSport = sport || 'CrossFit';

  // Nivel: primero el param del frontend (ya es el nivel del deporte correcto),
  // si no hay, busca en user.sports el deporte activo, luego fallback genérico
  const levelFromParam  = level || null;
  const levelFromSports = user.sports?.find(s => s.name === activeSport)?.level || null;
  const levelFromUser   = user.level || null;
  const resolvedLevel   = levelFromParam || levelFromSports || levelFromUser || 'Intermedio';

  if (!levelFromParam && !levelFromSports && !levelFromUser) {
    console.warn(`[workoutService] userId=${userId} sport=${activeSport} — nivel no encontrado → fallback 'Intermedio'`);
  }

  const history = await workoutRepo.getWorkoutsByUser(userId, 5);
  let mealContext = null;
  if (user.synergy_enabled) {
    const today = new Date().toISOString().split('T')[0];
    const allMeals = await mealRepo.getMealsByUser(userId, 10);
    mealContext = allMeals.filter(m => m.date && m.date.toString().split('T')[0] === today);
  }

  // Perfil del deporte activo (posición, objetivo, sesiones, etc.)
  const sportProfile = user.sports?.find(s => s.name === activeSport)?.profile || null;

  let plan;
  try {
    plan = await generateWorkout({
      user,
      history,
      level: resolvedLevel,
      synergy: !!user.synergy_enabled,
      mealContext,
      checkin: checkin || null,
      sport: activeSport,
      sportProfile,
    });
  } catch (e) {
    throw new Error(`Error generando entrenamiento con IA: ${e.message}`);
  }

  // Garantizar time_cap en WODs CrossFit que lo requieren
  if (activeSport === 'CrossFit') {
    const TIME_CAP_REQUIRED = ['For Time', 'Chipper', 'Hero WOD'];
    if (plan.wod && TIME_CAP_REQUIRED.includes(plan.wod.type) && !plan.wod.time_cap) {
      plan.wod.time_cap = '20 min';
      console.warn(`[workoutService] userId=${userId} — time_cap añadido por defecto en WOD tipo '${plan.wod.type}'`);
    }
  }

  // Guardar: para CrossFit usamos wod.movements, para otros deportes usamos exercises
  const exercisesToSave = plan.wod?.movements || plan.exercises || [];
  const saved = await workoutRepo.saveWorkout({
    user_id: userId,
    sport: activeSport,
    warmup: plan.warmup,
    exercises: exercisesToSave,
    stretching: plan.stretching,
    summary: plan.summary,
    difficulty: resolvedLevel,
    notes: null,
    wod_type: plan.wod_type || null,
    wod_format: plan.wod_format || null,
    wod: plan.wod || null,
    strength_block: plan.strength_block || null,
    ai_coaching_tip: plan.ai_coaching_tip || null,
  });

  const dietWarning = getDietSafetyWarning(user);

  return {
    ...saved,
    sport: activeSport,
    difficulty: resolvedLevel,
    wod_type: plan.wod_type || null,
    wod_format: plan.wod_format || null,
    wod: plan.wod || null,
    strength_block: plan.strength_block || null,
    ai_coaching_tip: plan.ai_coaching_tip || null,
    warmup: plan.warmup,
    exercises: plan.exercises || null,
    stretching: plan.stretching,
    summary: plan.summary,
    estimated_duration: plan.estimated_duration || null,
    diet_safety_warning: dietWarning,
  };
}

async function getHistory(userId, limit) { return workoutRepo.getWorkoutsByUser(userId, limit); }
async function saveNotes(workoutId, userId, notes) { return workoutRepo.updateWorkout(workoutId, userId, { notes }); }
async function updateWorkout(workoutId, userId, data) { return workoutRepo.updateWorkout(workoutId, userId, data); }

module.exports = { generateAndSave, getHistory, saveNotes, updateWorkout };
