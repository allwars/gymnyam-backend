const OpenAI = require('openai');

let _groq = null;
function getClient() {
  if (!_groq) {
    _groq = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      timeout: 90000,
    });
  }
  return _groq;
}

// Scout primero (más rápido y estable para visión), Maverick como fallback
const SCAN_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
];
const MEAL_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

function extractJson(text) {
  if (!text) throw new Error('Respuesta vacía');
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1].trim() : text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.search(/[\[{]/);
    const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
    if (start !== -1 && end !== -1 && end > start) {
      try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
    }
    throw new Error('La IA devolvio un formato incorrecto. Intentalo de nuevo.');
  }
}

async function callVision(model, messages, maxTokens = 1200) {
  const response = await getClient().chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature: 0,
    messages,
  });
  return response.choices[0]?.message?.content?.trim() || '';
}

// ─────────────────────────────────────────────
// ANÁLISIS DE COMIDA (foto de plato)
// ─────────────────────────────────────────────
async function analyzeMealPhoto({ user, imageBase64, mimeType = 'image/jpeg', synergy, workoutContext }) {
  const system = `Eres un dietista experto con vision computacional. Analiza la foto de una comida y estima su valor nutricional.
Responde UNICAMENTE con JSON valido, sin texto adicional:
{
  "foods": [{"name": "string", "quantity": "string", "calories": 100, "protein": 10, "carbs": 20, "fat": 5}],
  "nutritional_info": {"total_calories": 400, "total_protein": 30, "total_carbs": 50, "total_fat": 10},
  "advice": "string",
  "score": 7
}`;

  const contextParts = [
    `Perfil: objetivo ${user.goal}, peso ${user.weight}kg`,
    user.allergies ? `Alergias: ${user.allergies}` : '',
    synergy && workoutContext?.length ? `Entrenamiento de hoy: ${workoutContext[0]?.sport || 'realizado'}` : '',
  ].filter(Boolean).join('\n');

  console.log(`[Vision] Analizando comida...`);
  try {
    const text = await callVision(MEAL_MODEL, [
      { role: 'system', content: system },
      {
        role: 'user', content: [
          { type: 'text', text: `Analiza esta comida.\n${contextParts}` },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ], 800);
    console.log('[Vision] OK comida');
    return extractJson(text);
  } catch (err) {
    if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
      throw new Error('La IA tardó demasiado. Intentalo de nuevo.');
    }
    throw err;
  }
}

// ─────────────────────────────────────────────
// ESCANEO DE DESPENSA — Prompt conversacional
// ─────────────────────────────────────────────

// Paso 1: pedir descripción en texto libre (mucho más fiable que JSON directo)
const DESCRIBE_PROMPT = `Look at this photo carefully. List EVERY food product, drink, or edible item you can see.

Include absolutely everything: packaged food, fresh produce, vegetables, fruit, canned goods, beverages (water, juice, beer, wine, soda, milk), dairy products, eggs, meat, fish, condiments, sauces, snacks, cereal, bread, frozen food, broth, stock — anything edible.

For EACH item you see, write one line using this exact format:
ITEM: [product name in Spanish] | BRAND: [brand name as printed on label, or NONE] | SIZE: [package size like 1L / 500g / 330ml, or NONE]

Examples of good output:
ITEM: Caldo de pollo | BRAND: Gallina Blanca | SIZE: 1L
ITEM: Cerveza | BRAND: Estrella Damm | SIZE: 330ml
ITEM: Fresas | BRAND: Fresón de Palos | SIZE: 500g
ITEM: Queso cottage | BRAND: Exquisa | SIZE: 400g
ITEM: Leche | BRAND: NONE | SIZE: 1L
ITEM: Manzanas | BRAND: NONE | SIZE: NONE

Also add one line at the end:
QUALITY: good (if image is clear) / blurry (if out of focus) / partial (if cut off or very dark)

If you can see ANY food or drink, you MUST list it. Write every item you can identify.`;

// Paso 2: si el primero falla, pedir JSON directamente (estructura mínima)
const JSON_PROMPT = `You are a food scanner. Look at this photo and identify all food products and drinks visible.

Respond with ONLY valid JSON (no markdown, no extra text):
{"quality":"good","items":[{"name":"producto en español","brand":"marca o null","size":"tamaño o null"}]}

Include every food, drink, packaged product, or fresh produce you can see. Do not return an empty items array if food is visible.`;

async function scanPantryPhoto({ imageBase64, mimeType = 'image/jpeg' }) {
  const imageUrl = {
    type: 'image_url',
    image_url: { url: `data:${mimeType};base64,${imageBase64}` },
  };

  console.log(`[Vision] Iniciando escaneo — base64 length: ${imageBase64.length}`);

  for (const model of SCAN_MODELS) {
    console.log(`[Vision] Probando modelo: ${model}`);

    // ── Intento A: descripción en texto libre ──
    try {
      const text = await callVision(model, [
        {
          role: 'user',
          content: [
            { type: 'text', text: DESCRIBE_PROMPT },
            imageUrl,
          ],
        },
      ], 1200);

      console.log(`[Vision] Respuesta texto libre (${model}):\n${text.slice(0, 600)}`);

      const items = parseItemLines(text);
      const quality = parseQuality(text);

      if (items.length > 0) {
        console.log(`[Vision] ✅ Texto libre OK — ${items.length} productos con ${model}`);
        return {
          image_quality: quality,
          items,
          summary: `${items.length} productos detectados`,
        };
      }

      console.warn(`[Vision] Texto libre devolvió 0 items con ${model}. Raw: "${text.slice(0, 200)}"`);

    } catch (err) {
      console.error(`[Vision] Error en intento A con ${model}:`, err.message);
    }

    // ── Intento B: JSON directo (prompt mínimo) ──
    try {
      const text = await callVision(model, [
        {
          role: 'user',
          content: [
            { type: 'text', text: JSON_PROMPT },
            imageUrl,
          ],
        },
      ], 800);

      console.log(`[Vision] Respuesta JSON (${model}):\n${text.slice(0, 400)}`);

      try {
        const parsed = extractJson(text);
        const items = (parsed.items || []).map(i => ({
          name: i.name || i.product || '',
          brand: i.brand || null,
          quantity: i.size || i.quantity || null,
        })).filter(i => i.name && i.name.length > 1);

        if (items.length > 0) {
          console.log(`[Vision] ✅ JSON OK — ${items.length} productos con ${model}`);
          return {
            image_quality: parsed.quality || parsed.image_quality || 'good',
            items,
            summary: `${items.length} productos detectados`,
          };
        }
      } catch (parseErr) {
        console.warn(`[Vision] JSON parse error con ${model}:`, parseErr.message);
        // Intentar parsear como texto libre igualmente
        const items = parseItemLines(text);
        if (items.length > 0) {
          console.log(`[Vision] ✅ Fallback texto en intento B — ${items.length} productos`);
          return { image_quality: 'good', items, summary: `${items.length} productos detectados` };
        }
      }

    } catch (err) {
      console.error(`[Vision] Error en intento B con ${model}:`, err.message);
    }

    console.warn(`[Vision] Modelo ${model} no detectó nada. Probando siguiente...`);
  }

  // Ningún modelo detectó nada
  console.warn('[Vision] Ningún modelo detectó productos en ningún intento.');
  return { image_quality: 'partial', items: [], summary: '' };
}

// ─────────────────────────────────────────────
// Parsea líneas tipo: ITEM: Leche | BRAND: Pascual | SIZE: 1L
// ─────────────────────────────────────────────
function parseItemLines(text) {
  const lines = text.split('\n');
  const items = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Formato propio: ITEM: X | BRAND: Y | SIZE: Z
    if (/^ITEM:/i.test(trimmed)) {
      const nameMatch = trimmed.match(/ITEM:\s*([^|]+)/i);
      const brandMatch = trimmed.match(/BRAND:\s*([^|]+)/i);
      const sizeMatch = trimmed.match(/SIZE:\s*([^|]+)/i);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        const brand = brandMatch ? cleanValue(brandMatch[1]) : null;
        const quantity = sizeMatch ? cleanValue(sizeMatch[1]) : null;
        if (name.length > 1) items.push({ name, brand, quantity });
      }
      continue;
    }

    // Formato alternativo: PRODUCT: X | BRAND: Y | QTY: Z (por si acaso)
    if (/^PRODUCT:/i.test(trimmed)) {
      const nameMatch = trimmed.match(/PRODUCT:\s*([^|]+)/i);
      const brandMatch = trimmed.match(/BRAND:\s*([^|]+)/i);
      const qtyMatch = trimmed.match(/(?:QTY|SIZE):\s*([^|]+)/i);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        const brand = brandMatch ? cleanValue(brandMatch[1]) : null;
        const quantity = qtyMatch ? cleanValue(qtyMatch[1]) : null;
        if (name.length > 1) items.push({ name, brand, quantity });
      }
      continue;
    }

    // Formato numerado: "1. Leche - Pascual - 1L" o "- Leche (Pascual)"
    if (/^[\d]+\.\s/.test(trimmed) || /^[-•*]\s/.test(trimmed)) {
      const clean = trimmed.replace(/^[\d\.\-•*]+\s*/, '').trim();
      if (clean.length > 2 && !clean.toLowerCase().includes('quality:')) {
        // Intentar extraer marca entre paréntesis: "Leche (Pascual)"
        const parenMatch = clean.match(/^(.+?)\s*\(([^)]+)\)/);
        if (parenMatch) {
          items.push({ name: parenMatch[1].trim(), brand: parenMatch[2].trim(), quantity: null });
        } else {
          // Separado por guión: "Leche - Pascual - 1L"
          const parts = clean.split(/\s*[-–|]\s*/);
          items.push({
            name: parts[0].trim(),
            brand: parts[1]?.trim() || null,
            quantity: parts[2]?.trim() || null,
          });
        }
      }
    }
  }

  return items.filter(i => i.name && i.name.length > 1);
}

function cleanValue(str) {
  const v = str.trim();
  return (v.toUpperCase() === 'NONE' || v === '-' || v === '') ? null : v;
}

function parseQuality(text) {
  const lower = text.toLowerCase();
  if (/quality:\s*blurry/.test(lower)) return 'blurry';
  if (/quality:\s*partial/.test(lower)) return 'partial';
  if (/quality:\s*good/.test(lower)) return 'good';
  return 'good';
}

// ─────────────────────────────────────────────
// ANÁLISIS DE ETIQUETA DE PRODUCTO
// ─────────────────────────────────────────────
async function analyzeProductPhoto({ imageBase64, mimeType = 'image/jpeg' }) {
  const prompt = `Look at this food product label or package carefully.
Extract all the information you can read and respond with ONLY valid JSON (no markdown, no extra text):
{
  "name": "product name in Spanish",
  "brand": "brand name or null",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0,
  "sugar": 0,
  "salt": 0,
  "ingredients": "full ingredients list as text in Spanish, or null"
}

Rules:
- All nutritional values must be per 100g or 100ml
- If a value is not visible or readable, use 0
- For the ingredients field, copy the full text list if visible, otherwise null
- Respond with ONLY the JSON object, absolutely no other text`;

  const imageUrl = `data:${mimeType};base64,${imageBase64}`;

  for (const model of SCAN_MODELS) {
    try {
      console.log(`[Vision] analyzeProduct con ${model}`);
      const text = await callVision(model, [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ], 700);

      console.log(`[Vision] analyzeProduct respuesta: ${text.slice(0, 300)}`);
      const data = extractJson(text);
      return {
        name: (data.name || '').trim(),
        brand: data.brand && data.brand !== 'null' ? String(data.brand).trim() : null,
        calories: Number(data.calories) || 0,
        protein: Number(data.protein) || 0,
        carbs: Number(data.carbs) || 0,
        fat: Number(data.fat) || 0,
        fiber: Number(data.fiber) || 0,
        sugar: Number(data.sugar) || 0,
        salt: Number(data.salt) || 0,
        ingredients: data.ingredients && data.ingredients !== 'null' ? String(data.ingredients).trim() : null,
      };
    } catch (err) {
      console.error(`[Vision] analyzeProduct error con ${model}:`, err.message);
    }
  }

  throw new Error('No se pudo analizar la imagen del producto. Intenta con mejor iluminación.');
}

module.exports = { analyzeMealPhoto, scanPantryPhoto, analyzeProductPhoto };
