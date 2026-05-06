const { chat } = require('./client');

async function generateWorkout({ user, history, sport, level, synergy, mealContext }) {
  const hasHistory = history && history.length > 0;
  const difficultyValue = level || 'Intermedio';

  const system = `Eres un entrenador personal experto. Genera planes de entrenamiento personalizados y seguros.
Responde UNICAMENTE con JSON valido, sin texto adicional, con esta estructura exacta:
{
  "warmup": [{"exercise": "string", "duration": "string", "description": "string"}],
  "exercises": [{"name": "string", "sets": 3, "reps": "string", "weight": "string", "rest": "string", "tips": "string"}],
  "stretching": [{"exercise": "string", "duration": "string", "muscle": "string"}],
  "summary": "string",
  "difficulty": "${difficultyValue}",
  "estimated_duration": "string"
}
IMPORTANTE: el campo "difficulty" DEBE ser exactamente "${difficultyValue}" tal como se indica arriba.`;

  const context = [
    `Perfil: edad ${user.age}, sexo ${user.sex}, peso ${user.weight}kg, objetivo: ${user.goal}, sueno: ${user.sleep_hours}h`,
    user.injuries ? `Lesiones/limitaciones: ${user.injuries}` : '',
    sport ? `Deporte a entrenar: ${sport}` : '',
    level ? `Nivel del usuario en este deporte: ${level}. Adapta la dificultad, cargas y volumen a este nivel.` : '',
    hasHistory
      ? `Ultimos entrenos:\n${history.slice(0, 3).map(h =>
          `- ${h.sport || 'entreno'} (${h.date}): ${h.exercises?.length || 0} ejercicios, dificultad: ${h.difficulty || '?'}${h.notes ? ` | Notas: "${h.notes.substring(0, 100)}"` : ''}`
        ).join('\n')}`
      : 'Es su primer entrenamiento, empieza suave.',
    synergy && mealContext?.length
      ? `Comidas de hoy (sinergia activa): ${JSON.stringify(mealContext.map(m => ({ kcal: m.nutritional_info?.total_calories, protein: m.nutritional_info?.total_protein })))}`
      : '',
  ].filter(Boolean).join('\n');

  return chat(system, `Genera el entrenamiento de hoy.\n${context}`, 1500);
}

module.exports = { generateWorkout };
