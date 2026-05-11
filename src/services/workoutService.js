const { generateWorkout } = require('../agents/trainerAgent');
const workoutRepo = require('../repositories/workoutRepository');
const mealRepo = require('../repositories/mealRepository');
const userRepo = require('../repositories/userRepository');

async function generateAndSave({ userId, level, checkin }) {
  const user = await userRepo.getUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');

  // CrossFit: nivel desde parámetro, perfil de usuario, o defecto Intermedio
  const resolvedLevel = level
    || user.sports?.find(s => s.name === 'CrossFit')?.level
    || user.level
    || 'Intermedio';

  const history = await workoutRepo.getWorkoutsByUser(userId, 5);
  let mealContext = null;
  if (user.synergy_enabled) {
    const today = new Date().toISOString().split('T')[0];
    const allMeals = await mealRepo.getMealsByUser(userId, 10);
    mealContext = allMeals.filter(m => String(m.date).split('T')[0] === today);
  }

  const plan = await generateWorkout({
    user,
    history,
    level: resolvedLevel,
    synergy: !!user.synergy_enabled,
    mealContext,
    checkin: checkin || null,
  });

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
  };
}

async function getHistory(userId, limit) { return workoutRepo.getWorkoutsByUser(userId, limit); }
async function saveNotes(workoutId, userId, notes) { return workoutRepo.updateWorkout(workoutId, userId, { notes }); }
async function updateWorkout(workoutId, userId, data) { return workoutRepo.updateWorkout(workoutId, userId, data); }

module.exports = { generateAndSave, getHistory, saveNotes, updateWorkout };
