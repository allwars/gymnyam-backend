const { analyzeProgress } = require('../agents/progressAgent');
const { getUserById } = require('../repositories/userRepository');
const { getWorkoutById, getWorkoutsByUser } = require('../repositories/workoutRepository');
const { getMealsByUser } = require('../repositories/mealRepository');
const { upsertDailyStat, getDailyStats } = require('../repositories/dailyStatsRepository');

function toDateStr(d) { return d ? String(d).split('T')[0] : ''; }

async function analyzeWorkoutProgress(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const workoutId = Number(req.params.workoutId);
    const { notes, voiceNoteText } = req.body;

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    const currentWorkout = await getWorkoutById(workoutId);
    if (!currentWorkout) return res.status(404).json({ ok: false, error: 'Entrenamiento no encontrado' });

    const history = await getWorkoutsByUser(userId, 10);
    const prevHistory = history.filter(w => w.id !== workoutId);

    const analysis = await analyzeProgress({
      user, currentWorkout, notes, voiceNoteText, history: prevHistory,
    });

    res.json({ ok: true, analysis });
  } catch (err) {
    next(err);
  }
}

async function getCalendarMonth(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    const [workouts, meals] = await Promise.all([
      getWorkoutsByUser(userId, 200),
      getMealsByUser(userId, 200),
    ]);

    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const dayMap = {};

    workouts.filter(w => toDateStr(w.date).startsWith(prefix)).forEach(w => {
      const key = toDateStr(w.date);
      if (!dayMap[key]) dayMap[key] = { workouts: [], meals: [] };
      dayMap[key].workouts.push({ sport: w.sport, summary: w.summary });
    });

    meals.filter(m => toDateStr(m.date).startsWith(prefix)).forEach(m => {
      const key = toDateStr(m.date);
      if (!dayMap[key]) dayMap[key] = { workouts: [], meals: [] };
      dayMap[key].meals.push({ meal_time: m.meal_time, kcal: m.nutritional_info?.total_calories || 0 });
    });

    res.json({ ok: true, calendar: dayMap, year, month });
  } catch (err) {
    next(err);
  }
}

async function getWeekSummary(req, res, next) {
  try {
    const userId = Number(req.params.userId);

    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    const [workouts, meals] = await Promise.all([
      getWorkoutsByUser(userId, 50),
      getMealsByUser(userId, 100),
    ]);

    const week = days.map(date => {
      const dayWorkouts = workouts.filter(w => toDateStr(w.date) === date);
      const dayMeals = meals.filter(m => toDateStr(m.date) === date);
      return {
        date,
        hasWorkout: dayWorkouts.length > 0,
        hasMeal: dayMeals.length > 0,
        sports: [...new Set(dayWorkouts.map(w => w.sport))],
        mealCount: dayMeals.length,
        kcal: Math.round(dayMeals.reduce((s, m) => s + (m.nutritional_info?.total_calories || 0), 0)),
      };
    });

    res.json({ ok: true, week, startDate: days[0], endDate: days[6] });
  } catch (err) {
    next(err);
  }
}

async function saveDailyStat(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const { date, steps, distance_m, active_calories, sleep_hours, weight } = req.body;
    if (!date) return res.status(400).json({ ok: false, error: 'date requerido' });
    await upsertDailyStat(userId, date, { steps, distance_m, active_calories, sleep_hours, weight });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const days = Number(req.query.days) || 30;
    const stats = await getDailyStats(userId, days);

    // Merge workout & meal kcal into the daily rows
    const allWorkouts = await getWorkoutsByUser(userId, 200);
    const allMeals = await getMealsByUser(userId, 400);

    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    const sinceStr = since.toISOString().split('T')[0];

    const days7 = Array.from({ length: days }, (_, i) => {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    const merged = days7.map(date => {
      const stat = stats.find(s => s.date === date) || {};
      const dayWorkouts = allWorkouts.filter(w => toDateStr(w.date) === date);
      const dayMeals = allMeals.filter(m => toDateStr(m.date) === date);
      return {
        date,
        steps: stat.steps ?? null,
        distance_m: stat.distance_m ?? null,
        active_calories: stat.active_calories ?? null,
        sleep_hours: stat.sleep_hours ?? null,
        weight: stat.weight ?? null,
        workout_count: dayWorkouts.length,
        kcal: Math.round(dayMeals.reduce((s, m) => s + (m.nutritional_info?.total_calories || 0), 0)),
      };
    });

    res.json({ ok: true, history: merged });
  } catch (err) {
    next(err);
  }
}

module.exports = { analyzeWorkoutProgress, getCalendarMonth, getWeekSummary, saveDailyStat, getHistory };
