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
  const system = `Eres un dietista experto. Analiza comidas y da su valor nutricional estimado.
Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "foods": [{"name": "string", "quantity": "string", "calories": 100, "protein": 10, "carbs": 20, "fat": 5}],
  "nutritional_info": {"total_calories": 400, "total_protein": 30, "total_carbs": 50, "total_fat": 10},
  "advice": "string",
  "score": 7
}`;

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
      "ingredients": [{"name": "string", "quantity": "string", "calories": 100, "protein": 10, "carbs": 20, "fat": 5}],
      "recipe_steps": ["Paso 1...", "Paso 2...", "Paso 3..."],
      "prep_time": "15 min",
      "nutritional_info": {"total_calories": 400, "total_protein": 30, "total_carbs": 50, "total_fat": 10},
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

module.exports = { suggestMeal, analyzeExternalMeal, analyzePantry, suggestDishes };
