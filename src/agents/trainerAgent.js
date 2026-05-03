const { chat } = require('./client');

async function generateWorkout({ user, history, sport, synergy, mealContext }) {
  const hasHistory = history && history.length > 0;

  const system = `Eres un entrenador personal experto. Genera planes de entrenamiento personalizados y seguros.
Responde ÚNICAMENTE con JSON válido, sin texto adicional, con esta estructura exacta:
{
  "warmup": [{"exercise": "string", "duration": "string", "description": "string"}],
  "exercises": [{"name": "string", "sets": 3, "reps": "string", "weight": "string", "rest": "string", "tips": "string"}],
  "stretching": [{"exercise": "string", "duration": "string", "muscle": "string"}],
  "summary": "string",
  "difficulty": "string",
  "estimated_duration": "string"
}`;

  const context = [
    `Perfil: edad ${user.age}, sexo ${user.sex}, peso ${user.weight}kg, objetivo: ${user.goal}, sueño: ${user.sleep_hours}h`,
    user.injuries ? `Lesiones/limitaciones: ${user.injuries}` : '',
    sport ? `Deporte a entrenar: ${sport}` : '',
    hasHistory
      ? `Últimos entrenos (para progresión y contexto):\n${history.slice(0, 3).map(h =>
          `- ${h.sport || 'entreno'} (${h.date}): ${h.exercises?.length || 0} ejercicios, dificultad: ${h.difficulty || '?'}${h.notes ? ` | Notas del usuario: "${h.notes.replace(/\[audio:.*?\]/g, '[nota de voz]').substring(0, 200)}"` : ''}`
        ).join('\n')}`
      : 'Es su primer entrenamiento, empieza suave.',
    synergy && mealContext?.length
      ? `Comidas de hoy (sinergia activa, ajusta intensidad): ${JSON.stringify(mealContext.map(m => ({ kcal: m.nutritional_info?.total_calories, protein: m.nutritional_info?.total_protein })))}`
      : '',
  ].filter(Boolean).join('\n');

  return chat(system, `Genera el entrenamiento de hoy.\n${context}`, 1500);
}

module.exports = { generateWorkout };
