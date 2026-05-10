const { analyzeMealPhoto, scanPantryPhoto, analyzeProductPhoto } = require('../agents/visionAgent');
const pantryRepo = require('../repositories/pantryRepository');
const pantryService = require('../services/pantryService');
const workoutRepo = require('../repositories/workoutRepository');
const userRepo = require('../repositories/userRepository');
const mealRepo = require('../repositories/mealRepository');
const OpenAI = require('openai');

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

    // Solo detectar — el frontend se encarga de verificar con OFF y añadir a la DB
    const result = await scanPantryPhoto({ imageBase64, mimeType: mimeType || 'image/jpeg' });

    res.json({
      ok: true,
      image_quality: result.image_quality || 'good',
      detected: result.items || [],
      summary: result.summary || '',
      count: (result.items || []).length,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

// ── Debug: devuelve la respuesta RAW del modelo sin procesar ──
async function debugVision(req, res) {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) return res.status(400).json({ ok: false, error: 'Se requiere imageBase64' });

    const groq = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      timeout: 90000,
    });

    const model = 'meta-llama/llama-4-scout-17b-16e-instruct';
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    console.log(`[Debug] Enviando imagen al modelo ${model}, base64 length: ${imageBase64.length}`);

    const response = await groq.chat.completions.create({
      model,
      max_tokens: 800,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe everything you can see in this image. List all food products, drinks, and edible items.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    });

    const rawText = response.choices[0]?.message?.content || '';
    console.log(`[Debug] Respuesta raw:\n${rawText}`);

    res.json({
      ok: true,
      model,
      base64_length: imageBase64.length,
      raw_response: rawText,
      finish_reason: response.choices[0]?.finish_reason,
      usage: response.usage,
    });
  } catch (err) {
    console.error('[Debug] Error:', err.message);
    res.status(500).json({ ok: false, error: err.message, code: err.code });
  }
}

async function analyzeProduct(req, res) {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ ok: false, error: 'Se requiere imageBase64' });
    const product = await analyzeProductPhoto({ imageBase64, mimeType: mimeType || 'image/jpeg' });
    res.json({ ok: true, product });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = { analyzeMeal, scanPantry, debugVision, analyzeProduct };
