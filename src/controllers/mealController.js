const mealService = require('../services/mealService');
const mealRepo = require('../repositories/mealRepository');

async function suggest(req, res) {
  try {
    const userId = Number(req.params.userId);
    const { mealTime } = req.body;
    const meal = await mealService.suggest({ userId, mealTime });
    res.json({ ok: true, meal });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function analyzeExternal(req, res) {
  try {
    const userId = Number(req.params.userId);
    const { description, mealTime, dailyContext } = req.body;
    if (!description) return res.status(400).json({ ok: false, error: 'Descripcion requerida' });
    const meal = await mealService.analyzeExternal({ userId, description, mealTime, dailyContext });
    res.json({ ok: true, meal });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function getHistory(req, res) {
  try {
    const userId = Number(req.params.userId);
    const limit = Number(req.query.limit) || 30;
    const history = await mealService.getHistory(userId, limit);
    res.json({ ok: true, history });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function getPantryAnalysis(req, res) {
  try {
    const userId = Number(req.params.userId);
    const analysis = await mealService.getPantryAnalysis(userId);
    res.json({ ok: true, analysis });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function deleteMeal(req, res) {
  try {
    const mealId = Number(req.params.mealId);
    const userId = Number(req.query.userId);
    await mealRepo.deleteMeal(mealId, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function updateMeal(req, res) {
  try {
    const mealId = Number(req.params.mealId);
    const userId = Number(req.query.userId);
    const { meal_time, advice, foods } = req.body;
    const meal = await mealRepo.updateMeal(mealId, userId, { meal_time, advice, foods });
    if (!meal) return res.status(404).json({ ok: false, error: 'Comida no encontrada' });
    res.json({ ok: true, meal });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function getDishSuggestions(req, res) {
  try {
    const userId = Number(req.params.userId);
    const { mealTime, selectedIngredients, dailyContext } = req.body;
    // selectedIngredients: array de nombres de ingredientes seleccionados por el usuario
    // Si no se envía, se usa toda la despensa
    // dailyContext: estado nutricional del día (kcal consumidas, objetivo, macros, nota)
    const result = await mealService.getDishSuggestions({ userId, mealTime, selectedIngredients, dailyContext });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function confirmDish(req, res) {
  try {
    const userId = Number(req.params.userId);
    const { mealTime, dish } = req.body;
    if (!dish) return res.status(400).json({ ok: false, error: 'Plato requerido' });
    const meal = await mealService.confirmDish({ userId, mealTime, dish });
    res.json({ ok: true, meal });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = { suggest, analyzeExternal, getHistory, getPantryAnalysis, deleteMeal, getDishSuggestions, confirmDish, updateMeal };
