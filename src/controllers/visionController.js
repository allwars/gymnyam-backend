const { analyzeMealPhoto, scanPantryPhoto } = require('../agents/visionAgent');
const pantryRepo = require('../repositories/pantryRepository');
const workoutRepo = require('../repositories/workoutRepository');
const userRepo = require('../repositories/userRepository');
const mealRepo = require('../repositories/mealRepository');

function getCurrentMealTime() {
  const hour = new Date().getHours();
  if (hour < 10) return 'desayuno';
  if (hour < 12) return 'media_manana';
  if (hour < 15) return 'almuerzo';
  if (hour < 18) return 'merienda';
  return 'cena';
}

async function analyzeMeal(req, res) {
  try {
    const userId = Number(req.params.userId);
    const { imageBase64, mimeType, mealTime } = req.body;

    if (!imageBase64) return res.status(400).json({ ok: false, error: 'Se requiere imageBase64' });

    const user = await userRepo.getUserById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    let workoutContext = null;
    if (user.synergy_enabled) {
      const today = new Date().toISOString().split('T')[0];
      const allWorkouts = await workoutRepo.getWorkoutsByUser(userId, 5);
      workoutContext = allWorkouts.filter(w => String(w.date).split('T')[0] === today);
    }

    const result = await analyzeMealPhoto({
      user,
      imageBase64,
      mimeType: mimeType || 'image/jpeg',
      synergy: !!user.synergy_enabled,
      workoutContext,
    });

    // Guardar la comida analizada en el historial
    const meal = await mealRepo.saveMeal({
      user_id: userId,
      meal_time: mealTime || getCurrentMealTime(),
      type: 'photo',
      foods: result.foods || [],
      nutritional_info: result.nutritional_info || {},
      advice: result.advice || '',
      score: result.score || null,
    });

    res.json({ ok: true, meal, analysis: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function scanPantry(req, res) {
  try {
    const userId = Number(req.params.userId);
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) return res.status(400).json({ ok: false, error: 'Se requiere imageBase64' });

    const user = await userRepo.getUserById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    const result = await scanPantryPhoto({ imageBase64, mimeType: mimeType || 'image/jpeg' });

    // Añadir automáticamente los alimentos detectados a la despensa
    const addedItems = [];
    for (const item of result.items || []) {
      const nutritional_info = {
        calories_per_100g: item.calories_per_100g,
        protein_per_100g: item.protein_per_100g,
        carbs_per_100g: item.carbs_per_100g,
        fat_per_100g: item.fat_per_100g,
      };
      const saved = await pantryRepo.addItem({
        user_id: userId,
        name: item.name,
        quantity: item.quantity || null,
        nutritional_info,
        added_by: 'camera',
      });
      addedItems.push(saved);
    }

    res.json({ ok: true, added: addedItems, summary: result.summary, count: addedItems.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = { analyzeMeal, scanPantry };
