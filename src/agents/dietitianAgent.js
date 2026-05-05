const { chat } = require('./client');

async function suggestMeal({ user, mealTime, pantry, mealHistory, synergy, workoutContext }) {
  const system = `Eres un dietista experto en nutrición deportiva. Sugiere comidas reales, sencillas y preparables en casa.
IMPORTANTE: sugiere comidas comunes de la dieta mediterránea/española. Nada exótico ni de restaurante.
Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "suggestion": "string",
  "foods": [{"name": "string", "quantity": "string", "calories": 100, "protein": 10, "carbs": 20, "fat": 5}],
  "nutritional_info": {"total_calories": 400, "total_protein": 30, "total_carbs": 50, "total_fat": 10},
  "advice": "string",
  "score": 8
}`;

  const context = [
    `Perfil: objetivo ${user.goal}, peso ${user.weight}kg, edad ${user.age}`,
    user.allergies ? `Alergias: ${user.allergies}` : '',
    `Momento: ${mealTime}`,
    pantry?.length
      ? `USA ESTOS ingredientes de la despensa: ${pantry.map(p => `${p.name}${p.quantity ? ' (' + p.quantity + ')' : ''}`).join(', ')}`
      : 'Sin despensa, sugiere algo simple y común.',
    synergy && workoutContext?.length
      ? `Entrenamiento de hoy: ${workoutContext[0]?.sport || 'ejercicio'} — ajusta proteína/carbos según la actividad`
      : '',
  ].filter(Boolean).join('\n');

  return chat(system, `Sugiere qué comer ahora. Sé práctico y realista.\n${context}`, 1000);
}

async function analyzeExternalMeal({ user, description, synergy, workoutContext }) {
  const system = `Eres un dietista experto. Analiza comidas y da su valor nutricional estimado completo.
Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "foods": [{"name": "string", "quantity": "string", "calories": 100, "protein": 10, "carbs": 20, "fat": 5, "fiber": 2, "sugar": 3, "has_preservatives": false}],
  "nutritional_info": {"total_calories": 400, "total_protein": 30, "total_carbs": 50, "total_fat": 10, "total_fiber": 8, "total_sugar": 12},
  "advice": "string",
  "score": 7
}
"has_preservatives": true si el alimento es procesado y contiene aditivos/conservantes (E-xxx). false si es fresco o natural.`;

  const context = [
    `Perfil: objetivo ${user.goal}, peso ${user.weight}kg`,
    user.allergies ? `Alergias: ${user.allergies}` : '',
    `Comida a analizar: ${description}`,
    synergy && workoutContext?.length ? `Entrenamiento de hoy: ${workoutContext[0]?.sport || 'ejercicio'}` : '',
  ].filter(Boolean).join('\n');

  return chat(system, context, 800);
}

async function analyzePantry({ user, pantry, mealHistory }) {
  const system = `Eres un dietista experto. Analiza la despensa de un usuario.
Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "score": 7,
  "summary": "string",
  "strengths": ["string"],
  "improvements": ["string"],
  "motivation": "string"
}`;

  const context = `Objetivo: ${user.goal}\nAlimentos en despensa: ${pantry.map(p => p.name).join(', ')}\nComidas registradas: ${mealHistory?.length || 0}`;

  return chat(system, `Analiza esta despensa.\n${context}`, 600);
}

async function suggestDishes({ user, mealTime, pantry, mealHistory, synergy, workoutContext }) {
  const system = `Eres un dietista y cocinero experto en cocina casera española/mediterránea.
Sugiere 3 platos REALES, sencillos y que se pueden preparar en casa con ingredientes normales.
NORMAS ESTRICTAS:
- Platos cotidianos reales (tortilla, pasta, ensalada, filete, arroz, bocadillo, etc.)
- Tiempo de preparación realista (5-30 min)
- Si hay despensa, USA los ingredientes disponibles al máximo
- NO sugieras platos de restaurante ni recetas exóticas
- Varía: un plato caliente, uno rápido/frío, uno intermedio
Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "dishes": [
    {
      "name": "Nombre concreto del plato (ej: 'Tortilla de patatas', 'Pasta con tomate y atún')",
      "emoji": "🍳",
      "description": "Descripción breve en 1 frase",
      "ingredients": [{"name": "string", "quantity": "string", "calories": 100, "protein": 10, "carbs": 20, "fat": 5, "fiber": 2, "sugar": 3, "has_preservatives": false}],
      "recipe_steps": ["Paso 1...", "Paso 2...", "Paso 3..."],
      "prep_time": "15 min",
      "nutritional_info": {"total_calories": 400, "total_protein": 30, "total_carbs": 50, "total_fat": 10, "total_fiber": 8, "total_sugar": 12},
      "score": 8,
      "uses_pantry": true
    }
  ]
}`;

  const context = [
    `Perfil: objetivo ${user.goal}, peso ${user.weight}kg, edad ${user.age}, sexo ${user.sex}`,
    user.allergies ? `⚠️ Alergias/intolerancias: ${user.allergies}` : '',
    `Momento del día: ${mealTime}`,
    pantry?.length
      ? `INGREDIENTES DISPONIBLES (úsalos): ${pantry.map(p => `${p.name}${p.quantity ? ' (' + p.quantity + ')' : ''}`).join(', ')}`
      : 'Sin despensa — sugiere platos con ingredientes básicos comunes (huevos, pasta, arroz, pan, etc.).',
    mealHistory?.length
      ? `Comidas recientes (evita repetir): ${mealHistory.slice(0, 3).map(m => m.advice || m.foods?.[0]?.name).filter(Boolean).join(', ')}`
      : '',
    synergy && workoutContext?.length
      ? `Entrenamiento de hoy: ${workoutContext[0]?.sport || 'ejercicio'} — prioriza recuperación muscular`
      : '',
  ].filter(Boolean).join('\n');

  return chat(system, `Sugiere 3 platos caseros y realistas para ahora.\n${context}`, 2000);
}

async function lookupFoodNutrition({ foodName }) {
  const system = `Eres un experto nutricionista. Proporciona datos nutricionales precisos de alimentos.
Responde ÚNICAMENTE con JSON válido, sin texto adicional, con esta estructura exacta:
{
  "calories_per_100g": 0,
  "protein_per_100g": 0,
  "carbs_per_100g": 0,
  "fat_per_100g": 0,
  "saturated_fat_per_100g": 0,
  "fiber_per_100g": 0,
  "sugar_per_100g": 0,
  "salt_per_100g": 0,
  "has_preservatives": false,
  "additives_count": 0,
  "score": 0,
  "score_label": "Bueno",
  "positive_points": [
    { "icon": "🥩", "label": "string", "description": "string", "value": "string", "color": "green" }
  ],
  "negative_points": [
    { "icon": "⚠️", "label": "string", "description": "string", "value": "string", "color": "red" }
  ]
}
Reglas para score (0-100): empieza en 50, +20 si proteína>15g, +10 si fibra>3g, +10 si sin conservantes, -15 si azúcar>20g, -15 si grasas saturadas>5g, -10 si sal>1.5g, -20 si aditivos>5, máx 100 mín 0.
score_label: 0-39="Malo", 40-59="Mediocre", 60-74="Bueno", 75-100="Excelente".
En positive_points incluye solo los valores nuticionalmente buenos (proteína alta, fibra alta, sin conservantes, bajo en azúcar, bajo en sal, bajo en grasa saturada). color siempre "green".
En negative_points incluye solo los problemas (calorías altas >400, grasa saturada alta, azúcar alta, sal alta, conservantes/aditivos). color: "red" si muy malo, "orange" si moderado.
Iconos sugeridos: proteínas=🥩, fibra=🌿, azúcar=🍬, grasa=💧, grasa saturada=🫧, sal=🧂, calorías=🔥, aditivos=⚗️, natural=✅, energía=⚡`;

  return chat(system, `Analiza este alimento y devuelve sus datos nutricionales completos: "${foodName}"`, 1200);
}

module.exports = { suggestMeal, analyzeExternalMeal, analyzePantry, suggestDishes, lookupFoodNutrition };
