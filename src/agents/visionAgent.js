const OpenAI = require('openai');

let _groq = null;
function getClient() {
  if (!_groq) {
    _groq = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      timeout: 60000,
    });
  }
  return _groq;
}

const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

function extractJson(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1].trim() : text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.search(/[\[{]/);
    const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
    if (start !== -1 && end !== -1) {
      try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
    }
    throw new Error('La IA devolvio una respuesta incorrecta. Intentalo de nuevo.');
  }
}

async function analyzeMealPhoto({ user, imageBase64, mimeType = 'image/jpeg', synergy, workoutContext }) {
  const system = `Eres un dietista experto con vision computacional. Analiza la foto de una comida y estima su valor nutricional.
Responde UNICAMENTE con JSON valido, sin texto adicional:
{
  "foods": [{"name": "string", "quantity": "string", "calories": 100, "protein": 10, "carbs": 20, "fat": 5}],
  "nutritional_info": {"total_calories": 400, "total_protein": 30, "total_carbs": 50, "total_fat": 10},
  "advice": "string",
  "score": 7
}
"score" es 0-10 segun lo bien que encaja con el objetivo del usuario.`;

  const contextParts = [
    `Perfil: objetivo ${user.goal}, peso ${user.weight}kg`,
    user.allergies ? `Alergias: ${user.allergies}` : '',
    synergy && workoutContext?.length ? `Entrenamiento de hoy (sinergia): ${workoutContext[0]?.sport || 'realizado'}` : '',
  ].filter(Boolean).join('\n');

  console.log(`[Vision] Analizando foto de comida con ${VISION_MODEL}...`);
  try {
    const response = await getClient().chat.completions.create({
      model: VISION_MODEL,
      max_tokens: 800,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analiza esta comida y devuelve su valor nutricional.\n${contextParts}` },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) throw new Error('La IA no devolvio contenido.');
    console.log(`[Vision] OK analisis de comida`);
    return extractJson(text);
  } catch (err) {
    if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
      throw new Error('La IA tardo demasiado analizando la foto. Intentalo de nuevo.');
    }
    throw err;
  }
}

async function scanPantryPhoto({ imageBase64, mimeType = 'image/jpeg' }) {
  const system = `Eres un experto en nutricion con vision computacional. Analiza la foto de una nevera o despensa e identifica todos los alimentos visibles con sus valores nutricionales estimados por 100g.
Responde UNICAMENTE con JSON valido, sin texto adicional:
{
  "items": [
    {
      "name": "string",
      "quantity": "string o null",
      "calories_per_100g": 100,
      "protein_per_100g": 5,
      "carbs_per_100g": 20,
      "fat_per_100g": 3,
      "fiber_per_100g": 2,
      "sugar_per_100g": 4,
      "has_preservatives": false
    }
  ],
  "summary": "string"
}`;

  console.log(`[Vision] Escaneando nevera/despensa con ${VISION_MODEL}...`);
  try {
    const response = await getClient().chat.completions.create({
      model: VISION_MODEL,
      max_tokens: 1200,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Identifica todos los alimentos que ves en esta nevera o despensa.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) throw new Error('La IA no devolvio contenido.');
    console.log(`[Vision] OK escaneo de nevera`);
    return extractJson(text);
  } catch (err) {
    if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
      throw new Error('La IA tardo demasiado analizando la foto. Intentalo de nuevo.');
    }
    throw err;
  }
}

module.exports = { analyzeMealPhoto, scanPantryPhoto };
