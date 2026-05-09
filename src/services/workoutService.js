const { generateWorkout } = require('../agents/trainerAgent');
const workoutRepo = require('../repositories/workoutRepository');
const mealRepo = require('../repositories/mealRepository');
const userRepo = require('../repositories/userRepository');

async function generateAndSave({ userId, sport, level }) {
  const user = await userRepo.getUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');

  const sportName = sport || user.sports?.[0]?.name;
  const matchedSport = user.sports?.find(s => s.name === sportName);
  const resolvedLevel = level || matchedSport?.level || null;

  const history = await workoutRepo.getWorkoutsByUser(userId, 5);
  let mealContext = null;
  if (user.synergy_enabled) {
    const today = new Date().toISOString().split('T')[0];
    const allMeals = await mealRepo.getMealsByUser(userId, 10);
    mealContext = allMeals.filter(m => String(m.date).split('T')[0] === today);
  }
  const plan = await generateWorkout({
    user, history,
    sport: sportName,
    level: resolvedLevel,
    synergy: !!user.synergy_enabled,
    mealContext,
  });
  const saved = await workoutRepo.saveWorkout({
    user_id: userId,
    sport: sportName,
    warmup: plan.warmup,
    exercises: plan.exercises,
    stretching: plan.stretching,
    summary: plan.summary,
    difficulty: resolvedLevel,
    notes: null,
  });
  // Incluir difficulty en la respuesta aunque no esté aún en Supabase
  return { ...saved, difficulty: resolvedLevel };
}

async function getHistory(userId, limit) { return workoutRepo.getWorkoutsByUser(userId, limit); }
async function saveNotes(workoutId, userId, notes) { return workoutRepo.updateWorkout(workoutId, userId, { notes }); }
async function updateWorkout(workoutId, userId, data) { return workoutRepo.updateWorkout(workoutId, userId, data); }

module.exports = { generateAndSave, getHistory, saveNotes, updateWorkout };
