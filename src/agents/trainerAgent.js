const { chat } = require('./client');

/**
 * Trainer Agent — multi-sport
 * CrossFit: WODs adaptativos (AMRAP, EMOM, For Time…)
 * Otros deportes: sesiones de entrenamiento específicas
 */
async function generateWorkout({ user, history, level, synergy, mealContext, checkin, sport, sportProfile }) {
  const resolvedLevel = level || 'Intermedio';
  const activeSport   = sport || 'CrossFit';

  const checkinCtx = checkin ? [
    `Check-in pre-entreno:`,
    `- Estado físico: ${checkin.physicalState || 'Normal'}`,
    `- Estado nutricional: ${checkin.nutritionState || 'Correcto'}`,
    `- Contexto: ${checkin.context || 'Sin novedades'}`,
    `Reglas: BAJO→bajar intensidad,evitar impacto alto | NORMAL→estándar | ALTO→subir intensidad`,
  ].join('\n') : '';

  const historyCtx = history && history.length > 0
    ? `Últimos entrenos (no repetir el mismo patrón 2 días seguidos):\n${history.slice(0, 3).map(h =>
        `- ${h.date}: ${h.sport || 'entreno'} | ${h.exercises?.map(e => e.name).join(', ') || ''} | nivel: ${h.difficulty || '?'}`
      ).join('\n')}`
    : 'Primera sesión registrada. Empezar con moderación, priorizar técnica.';

  const synergyCtx = synergy && mealContext && mealContext.length
    ? `Ingesta hoy: ${JSON.stringify(mealContext.map(m => ({ kcal: m.nutritional_info?.total_calories, prot: m.nutritional_info?.total_protein })))}`
    : '';

  const profileCtx = sportProfile
    ? `Perfil de ${activeSport}: ${JSON.stringify(sportProfile)}`
    : '';

  const userCtx = [
    `Perfil: edad ${user.age || 'N/D'}, sexo ${user.sex || 'N/D'}, peso ${user.weight || 'N/D'}kg, objetivo: ${user.goal || 'salud general'}, sueño: ${user.sleep_hours || 7}h`,
    user.injuries ? `Lesiones/limitaciones: ${user.injuries} → adaptar ejercicios` : '',
    `Deporte: ${activeSport} | Nivel: ${resolvedLevel}`,
    profileCtx,
    checkinCtx,
    historyCtx,
    synergyCtx,
  ].filter(Boolean).join('\n\n');

  // ── CrossFit: prompt específico con WOD ──────────────────────────────────────
  if (activeSport === 'CrossFit') {
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
    "time_cap": "OBLIGATORIO si type es 'For Time', 'Chipper' o 'Hero WOD' (ej: '20 min'). null solo para AMRAP y EMOM.",
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
- time_cap OBLIGATORIO en For Time, Chipper, Hero WOD. null para AMRAP y EMOM.
- WOD con 3-5 movimientos máximo
- SIEMPRE incluir scaling para los 3 niveles`;

    return chat(system, `Genera el WOD de CrossFit de hoy.\n\n${userCtx}`, 2000);
  }

  // ── Otros deportes: plan de entrenamiento genérico ───────────────────────────
  const sportTips = {
    'Fútbol':        'sesión de fútbol: velocidad, agilidad, resistencia aeróbica, trabajo con balón si procede',
    'Pesas':         'sesión de gym: series/repeticiones, tiempo bajo tensión, progresión de carga',
    'Running':       'sesión de running: volumen, ritmo, series o tempo según el nivel',
    'Natación':      'sesión de piscina: técnica, series de nado, recuperación activa',
    'Ciclismo':      'sesión de ciclismo: potencia, cadencia, intervalos o fondo',
    'Tenis':         'sesión de tenis: técnica de golpeo, footwork, resistencia específica',
    'Pádel':         'sesión de pádel: footwork, técnica de bandeja/vibora, resistencia',
    'Baloncesto':    'sesión de baloncesto: velocidad, cambios de dirección, tiro, resistencia',
    'Artes Marciales': 'sesión de artes marciales: técnica, sparring ligero, acondicionamiento',
    'Yoga / Pilates':'sesión de yoga/pilates: movilidad, control corporal, respiración',
    'Rugby':         'sesión de rugby: contacto, sprint, resistencia, trabajo de equipo',
  };
  const sportHint = sportTips[activeSport] || `sesión de ${activeSport}: ejercicios específicos del deporte, calentamiento y vuelta a la calma`;

  const system = `Eres un preparador físico especialista en ${activeSport}. Genera una sesión de entrenamiento adaptada al nivel ${resolvedLevel}.

Responde ÚNICAMENTE con JSON válido sin texto adicional:
{
  "warmup": [
    {"name": "string", "duration": "string", "description": "string"}
  ],
  "exercises": [
    {
      "name": "string",
      "sets": 3,
      "reps": "string (ej: '10', '30s', '400m')",
      "rest": "string (ej: '60s', '2 min')",
      "description": "string — qué hacer y cómo",
      "tips": "string — clave técnica o táctica"
    }
  ],
  "stretching": [{"name": "string", "duration": "string", "muscle": "string"}],
  "ai_coaching_tip": "string — consejo personalizado 1-2 frases",
  "estimated_duration": "string (ej: '60 min')",
  "difficulty": "${resolvedLevel}",
  "summary": "string motivador 1-2 frases"
}

REGLAS:
- Foco en ${sportHint}
- difficulty DEBE ser exactamente "${resolvedLevel}"
- exercises: 4-7 ejercicios relevantes para ${activeSport}
- Adaptar al check-in del usuario (físico bajo → menos intensidad, físico alto → más)
- warmup específico para los músculos y movimientos del ${activeSport}
- stretching post-sesión de los músculos más trabajados
- NO generes CrossFit ni WODs — genera entrenamiento de ${activeSport}`;

  return chat(system, `Genera la sesión de ${activeSport} de hoy.\n\n${userCtx}`, 2000);
}

module.exports = { generateWorkout };
