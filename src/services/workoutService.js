const { generateWorkout } = require('../agents/trainerAgent');
const workoutRepo = require('../repositories/workoutRepository');
const mealRepo = require('../repositories/mealRepository');
const userRepo = require('../repositories/userRepository');

async function generateAndSave({ userId, sport, level }) {
  const user = await userRepo.getUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');
  const history = await workoutRepo.getWorkoutsByUser(userId, 5);
  let mealContext = null;
  if (user.synergy_enabled) {
    const today = new Date().toISOString().split('T')[0];
    const allMeals = await mealRepo.getMealsByUser(userId, 10);
    mealContext = allMeals.filter(m => String(m.date).split('T')[0] === today);
  }
  const plan = await generateWorkout({
    user, history,
    sport: sport || (user.sports?.[0]?.name),
    level: level || (user.sports?.[0]?.level),
    synergy: !!user.synergy_enabled,
    mealContext,
  });
  return workoutRepo.saveWorkout({
    user_id: userId,
    sport: sport || (user.sports?.[0]?.name),
    warmup: plan.warmup,
    exercises: plan.exercises,
    stretching: plan.stretching,
    summary: plan.summary,
    notes: null,
  });
}

async function getHistory(userId, limit) { return workoutRepo.getWorkoutsByUser(userId, limit); }
async function saveNotes(workoutId, userId, notes) { return workoutRepo.updateWorkout(workoutId, userId, { notes }); }
async function updateWorkout(workoutId, userId, data) { return workoutRepo.updateWorkout(workoutId, userId, data); }

module.exports = { generateAndSave, getHistory, saveNotes, updateWorkout };
