const { chat } = require('./client');

// ─────────────────────────────────────────────────────────────────────────────
// buildSessionRules — convierte perfil del deporte + check-in en reglas duras
// que la IA DEBE respetar (duración, equipamiento, estilo, estado del usuario)
// ─────────────────────────────────────────────────────────────────────────────
function buildSessionRules(sport, profile = {}, checkin = {}) {
  const rules = [];

  // ── DURACIÓN ─────────────────────────────────────────────────────────────
  // Primero el check-in "poco tiempo" (override del perfil si hay conflicto)
  const pocoCT = checkin.context === 'poco_tiempo';

  const dur = pocoCT ? '20 min' : (profile.session_duration || null);
  if (dur === '20 min' || pocoCT) {
    rules.push('⏱ DURACIÓN MÁXIMA 20 MIN. Sin bloque de fuerza. Calentamiento ≤3 min. WOD/circuito ≤15 min. Máximo 3 ejercicios principales. Stretching 2 min.');
  } else if (dur === '30 min') {
    rules.push('⏱ DURACIÓN: 30 min. Calentamiento 5 min. Bloque principal 20 min (bloque fuerza corto O WOD, no ambos). Stretching 5 min. Máximo 4 ejercicios.');
  } else if (dur === '45 min') {
    rules.push('⏱ DURACIÓN: 45 min. Calentamiento 8 min. Bloque fuerza + WOD estándar. Stretching 7 min.');
  } else if (dur === '60 min+') {
    rules.push('⏱ DURACIÓN: 60+ min. Sesión completa: calentamiento 10 min + bloque fuerza + WOD largo + stretching 10 min.');
  }

  // ── EQUIPAMIENTO (Fitness en casa y otros) ────────────────────────────────
  if (profile.equipment !== undefined) {
    const eq = Array.isArray(profile.equipment) ? profile.equipment : [profile.equipment];
    if (eq.length === 0 || (eq.length === 1 && eq[0] === 'Sin material')) {
      rules.push('🏠 SOLO PESO CORPORAL. PROHIBIDO mencionar pesas, mancuernas, barras, máquinas o cualquier material. Usa únicamente: flexiones, sentadillas, zancadas, burpees, planchas, dominadas sin barra, saltos, abdominales, hip thrust sin peso.');
    } else {
      const allowed = eq.filter(e => e !== 'Sin material').join(', ');
      rules.push(`🏠 EQUIPAMIENTO DISPONIBLE ÚNICAMENTE: ${allowed} + peso corporal. PROHIBIDO usar material que no esté en esta lista.`);
      if (!eq.includes('Barra de dominadas')) rules.push('  → Sin barra de dominadas: no pongas pull-ups ni chin-ups.');
      if (!eq.includes('Kettlebell'))         rules.push('  → Sin kettlebell: no pongas swings ni turkish get-up.');
      if (!eq.includes('TRX / Suspensión'))   rules.push('  → Sin TRX: no pongas ejercicios de suspensión.');
    }
  }

  // ── TIPO DE ENTRENAMIENTO ─────────────────────────────────────────────────
  const tt = profile.training_type;
  if (tt === 'HIIT') {
    rules.push('💥 ESTILO HIIT: intervalos máxima intensidad. Formato: 20-40s trabajo / 10-20s descanso. Ejercicios explosivos. Tiempo bajo en descanso.');
  } else if (tt === 'Fuerza / Calistenia') {
    rules.push('💪 ESTILO FUERZA/CALISTENIA: progresión de dificultad. 3-5 series × 5-12 reps. Descanso 90s-3 min entre series. Prioriza técnica y tensión muscular.');
  } else if (tt === 'Cardio') {
    rules.push('🏃 ESTILO CARDIO: actividad aeróbica continua o intervalos moderados. FC en zona 2-3. Ritmo sostenible. Sin ejercicios de fuerza máxima.');
  } else if (tt === 'Movilidad / Stretching') {
    rules.push('🧘 ESTILO MOVILIDAD: ejercicios de movilidad articular, stretching dinámico y estático. Sin carga, sin impacto. Foco en rango de movimiento.');
  } else if (tt === 'Mixto') {
    rules.push('🔀 ESTILO MIXTO: combina fuerza + cardio en la misma sesión. Alterna bloques de fuerza con intervalos aeróbicos.');
  }

  // ── CHECK-IN: ESTADO FÍSICO ───────────────────────────────────────────────
  const phys = (checkin.physicalState || 'Normal').toLowerCase();
  if (phys === 'bajo' || phys === 'low') {
    rules.push('🔴 ESTADO FÍSICO BAJO: reduce volumen e intensidad un 40%. Evita saltos y carga máxima. Prioriza técnica y movilidad. Si hay molestias, elimina el ejercicio que las cause.');
  } else if (phys === 'alto' || phys === 'high') {
    rules.push('🟢 ESTADO FÍSICO ALTO: puedes subir intensidad. Añade 1 set extra o aumenta carga un 5-10%.');
  }

  // ── CHECK-IN: CONTEXTO ────────────────────────────────────────────────────
  if (checkin.context === 'mal_descanso') {
    rules.push('😴 MAL DESCANSO: reduce volumen 30%. Nada de movimientos olímpicos pesados. Foco en calidad de movimiento, no en intensidad.');
  }
  if (checkin.context === 'molestias') {
    rules.push('🤕 MOLESTIAS: solo ejercicios de bajo impacto. Nada de saltos, nada de cargas altas. Ofrece siempre alternativa de bajo impacto para cada ejercicio.');
  }

  // ── CROSSFIT: 1RM para sugerencias de peso ────────────────────────────────
  if (sport === 'CrossFit' || sport === 'crossfit') {
    const rms = [];
    if (profile.rm_backsquat) rms.push(`Back Squat 1RM: ${profile.rm_backsquat}kg`);
    if (profile.rm_deadlift)  rms.push(`Deadlift 1RM: ${profile.rm_deadlift}kg`);
    if (profile.rm_clean)     rms.push(`Clean 1RM: ${profile.rm_clean}kg`);
    if (profile.rm_snatch)    rms.push(`Snatch 1RM: ${profile.rm_snatch}kg`);
    if (profile.rm_press)     rms.push(`Press 1RM: ${profile.rm_press}kg`);
    if (profile.rm_thruster)  rms.push(`Thruster 1RM: ${profile.rm_thruster}kg`);
    if (rms.length) {
      rules.push(`🏋 1RM CONOCIDOS: ${rms.join(' | ')}. Calcula weight_suggestion como porcentaje exacto de estos RM (ej: "70% = ${Math.round((profile.rm_clean||100)*0.7)}kg"). NO uses pesos genéricos.`);
    }

    // CrossFit en casa
    if (profile.context === 'Gym en casa / garaje') {
      rules.push('🏠 CROSSFIT EN CASA: adapta WOD para espacio reducido. Sin barras olímpicas a menos que el usuario lo indique. Prioriza mancuernas, kettlebell, bandas y peso corporal.');
    }
  }

  return rules.length
    ? `\n\n⚡ RESTRICCIONES OBLIGATORIAS (debes cumplirlas todas sin excepción):\n${rules.join('\n')}`
    : '';
}

/**
 * Trainer Agent — multi-sport
 * CrossFit: WODs adaptativos (AMRAP, EMOM, For Time…)
 * Otros deportes: sesiones de entrenamiento específicas
 */
async function generateWorkout({ user, history, level, synergy, mealContext, checkin, sport, sportProfile }) {
  const resolvedLevel = level || 'Intermedio';
  const activeSport   = sport || 'CrossFit';

  // Reglas derivadas del perfil + check-in (duración, material, estilo, estado)
  const sessionRules = buildSessionRules(activeSport, sportProfile || {}, checkin || {});

  const checkinCtx = checkin ? [
    `Check-in pre-entreno:`,
    `- Estado físico: ${checkin.physicalState || 'Normal'}`,
    `- Estado nutricional: ${checkin.nutritionState || 'Correcto'}`,
    `- Contexto: ${checkin.context || 'Sin novedades'}`,
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
    const system = `Eres un coach CrossFit CF-L2. Genera WODs adaptativos, seguros y progresivos.${sessionRules}

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
    'Fútbol':          'sesión de fútbol: velocidad, agilidad, resistencia aeróbica, trabajo con balón si procede',
    'Pesas':           'sesión de gym: series/repeticiones, tiempo bajo tensión, progresión de carga',
    'Running':         'sesión de running: volumen, ritmo, series o tempo según el nivel',
    'Natación':        'sesión de piscina: técnica, series de nado, recuperación activa',
    'Ciclismo':        'sesión de ciclismo: potencia, cadencia, intervalos o fondo',
    'Tenis':           'sesión de tenis: técnica de golpeo, footwork, resistencia específica',
    'Pádel':           'sesión de pádel: footwork, técnica de bandeja/vibora, resistencia',
    'Baloncesto':      'sesión de baloncesto: velocidad, cambios de dirección, tiro, resistencia',
    'Artes Marciales': 'sesión de artes marciales: técnica, sparring ligero, acondicionamiento',
    'Yoga / Pilates':  'sesión de yoga/pilates: movilidad, control corporal, respiración',
    'Rugby':           'sesión de rugby: contacto, sprint, resistencia, trabajo de equipo',
    'Fitness en casa': 'sesión de fitness en casa: usa SOLO el equipamiento declarado en el perfil; respeta la duración y el tipo de entrenamiento configurados',
    'Caminar / Senderismo': 'sesión de caminar/senderismo: ritmo, duración, desnivel si procede',
  };
  const sportHint = sportTips[activeSport] || `sesión de ${activeSport}: ejercicios específicos del deporte, calentamiento y vuelta a la calma`;

  const system = `Eres un preparador físico especialista en ${activeSport}. Genera una sesión de entrenamiento adaptada al nivel ${resolvedLevel}.${sessionRules}

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
