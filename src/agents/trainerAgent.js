const { chat } = require('./client');

/**
 * CrossFit Trainer Agent
 * Genera WODs adaptativos: AMRAP, EMOM, For Time, Chipper, Strength+WOD
 */
async function generateWorkout({ user, history, level, synergy, mealContext, checkin }) {
  const hasHistory = history && history.length > 0;
  const resolvedLevel = level || 'Intermedio';

  const checkinCtx = checkin ? [
    `Check-in pre-entreno:`,
    `- Estado físico: ${checkin.physicalState || 'Normal'}`,
    `- Estado nutricional: ${checkin.nutritionState || 'Correcto'}`,
    `- Contexto: ${checkin.context || 'Sin novedades'}`,
    `Reglas: BAJO→bajar intensidad,evitar HIIT,priorizar técnica | NORMAL→estándar | ALTO→subir intensidad,WOD duro`,
  ].join('\n') : '';

  const historyCtx = hasHistory
    ? `Últimos entrenos (no repetir movimientos 2 días seguidos):\n${history.slice(0, 3).map(h =>
        `- ${h.date}: ${h.exercises?.map(e => e.name).join(', ') || 'entreno'} | nivel: ${h.difficulty || '?'}`
      ).join('\n')}`
    : 'Primer entrenamiento. Empezar suave, priorizar técnica.';

  const synergyCtx = synergy && mealContext && mealContext.length
    ? `Ingesta hoy: ${JSON.stringify(mealContext.map(m => ({ kcal: m.nutritional_info && m.nutritional_info.total_calories, prot: m.nutritional_info && m.nutritional_info.total_protein })))}`
    : '';

  const system = `Eres un coach CrossFit CF-L2. Genera WODs adaptativos, seguros y progresivos.

Responde ÚNICAMENTE con JSON válido sin texto adicional:
{
  "wod_type": "AMRAP|EMOM|For Time|Chipper|Ladder|Strength+WOD|Hero WOD",
  "wod_format": "ej: 20 min AMRAP",
  "warmup": [{"exercise":"string","duration":"string","description":"string","scaling":"string"}],
  "strength_block": {
    "name": "string",
    "sets": 4,
    "reps": "string",
    "weight_suggestion": "string",
    "rest": "string",
    "technique_tip": "string",
    "image_query": "string en inglés descriptivo",
    "scaling": {"principiante":"string","intermedio":"string","rx":"string"}
  },
  "wod": {
    "type": "AMRAP|EMOM|For Time|Chipper",
    "format": "string",
    "time_cap": "string o null",
    "movements": [
      {
        "name": "string",
        "reps": "string",
        "technique_tip": "string",
        "image_query": "string en inglés descriptivo",
        "scaling": {"principiante":"string","intermedio":"string","rx":"string"},
        "common_mistake": "string"
      }
    ],
    "score_type": "Rounds + reps|Tiempo|Carga total",
    "ai_pacing_tip": "string"
  },
  "stretching": [{"exercise":"string","duration":"string","muscle":"string"}],
  "ai_coaching_tip": "string personalizado 1-2 frases",
  "estimated_duration": "string",
  "difficulty": "${resolvedLevel}",
  "summary": "string motivador 1-2 frases"
}

REGLAS:
- difficulty DEBE ser exactamente "${resolvedLevel}"
- strength_block puede ser null
- image_query siempre en inglés y descriptivo para buscar imágenes técnicas
- Movimientos CrossFit reales: thruster, burpee, double under, pull-up, toes-to-bar, deadlift, clean, snatch, box jump, wall ball, kettlebell swing, ring muscle-up, handstand push-up, row, assault bike, etc.
- SIEMPRE incluir scaling para los 3 niveles
- WOD con 3-5 movimientos máximo
- Warmup debe activar específicamente los músculos del WOD`;

  const userCtx = [
    `Perfil: edad ${user.age}, sexo ${user.sex}, peso ${user.weight}kg, objetivo: ${user.goal}, sueño: ${user.sleep_hours}h`,
    user.injuries ? `Lesiones/limitaciones: ${user.injuries} → adaptar movimientos` : '',
    `Nivel CrossFit: ${resolvedLevel}`,
    checkinCtx,
    historyCtx,
    synergyCtx,
  ].filter(Boolean).join('\n\n');

  return chat(system, `Genera el WOD de CrossFit de hoy.\n\n${userCtx}`, 2000);
}

module.exports = { generateWorkout };
