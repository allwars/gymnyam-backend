const { chat } = require('./client');

// ─────────────────────────────────────────────────────────────────────────────
// buildSessionRules — convierte perfil del deporte + check-in en reglas duras
// que la IA DEBE respetar (duración, equipamiento, estilo, estado del usuario)
// ─────────────────────────────────────────────────────────────────────────────
function buildSessionRules(sport, profile = {}, checkin = {}) {
  const rules = [];
  const ctx   = checkin.context || '';
  const phys  = (checkin.physicalState || 'Normal').toLowerCase();

  // ── DURACIÓN EFECTIVA ─────────────────────────────────────────────────────
  // Lógica de prioridad:
  //  1. poco_tiempo  → cap 20 min  (siempre override)
  //  2. mal_descanso → cap 30 min  (si el perfil dice más)
  //  3. molestias    → cap 30 min
  //  4. físico bajo  → cap 30 min  (no tiene sentido sesión larga con cuerpo bajo)
  //  5. perfil del deporte (session_duration)
  //  6. sin dato     → la IA elige según deporte/nivel

  const profileDur = profile.session_duration || null;
  const durMinutes = profileDur === '20 min' ? 20
                   : profileDur === '30 min' ? 30
                   : profileDur === '45 min' ? 45
                   : profileDur === '60 min+' ? 60
                   : null;

  let effectiveMin = durMinutes; // puede ser null si no configurado

  if (ctx === 'poco_tiempo')  effectiveMin = Math.min(effectiveMin ?? 20, 20);
  if (ctx === 'mal_descanso') effectiveMin = Math.min(effectiveMin ?? 30, 30);
  if (ctx === 'molestias')    effectiveMin = Math.min(effectiveMin ?? 30, 30);
  if (phys === 'bajo' || phys === 'low') effectiveMin = Math.min(effectiveMin ?? 30, 30);

  if (effectiveMin === 20) {
    rules.push('⏱ DURACIÓN MÁXIMA 20 MIN. Calentamiento ≤3 min. Bloque principal ≤13 min (sin bloque de fuerza, máx 3 ejercicios). Stretching ≤4 min. NO superar este tiempo bajo ningún concepto.');
  } else if (effectiveMin === 30) {
    rules.push('⏱ DURACIÓN: 30 min. Calentamiento 5 min. Bloque principal 20 min (fuerza corta O cardio, no ambos completos). Stretching 5 min. Máximo 4 ejercicios.');
  } else if (effectiveMin === 45) {
    rules.push('⏱ DURACIÓN: 45 min. Calentamiento 8 min. Bloque fuerza + cardio/WOD estándar. Stretching 7 min.');
  } else if (effectiveMin === 60) {
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
  if (phys === 'bajo' || phys === 'low') {
    rules.push('🔴 ESTADO FÍSICO BAJO: intensidad −40%, volumen −40%. Evita saltos y carga máxima. Sustituye ejercicios explosivos por variantes de baja intensidad. Prioriza técnica y movilidad.');
  } else if (phys === 'alto' || phys === 'high') {
    rules.push('🟢 ESTADO FÍSICO ALTO: puedes subir intensidad. Añade 1 set extra o aumenta carga un 5-10%.');
  }

  // ── CHECK-IN: CONTEXTO ────────────────────────────────────────────────────
  if (ctx === 'mal_descanso') {
    rules.push('😴 MAL DESCANSO: volumen −30%, intensidad −20%. PROHIBIDO movimientos olímpicos pesados (Clean, Snatch, Jerk). Foco en calidad de movimiento. Evita ejercicios de equilibrio complejo. Prioriza aeróbico suave o fuerza de bajo impacto.');
  }
  if (ctx === 'molestias') {
    rules.push('🤕 MOLESTIAS: SOLO ejercicios de bajo impacto. Sin saltos, sin cargas ≥50% RM, sin sprint. Para CADA ejercicio que incluyas, añade en "tips" una alternativa de bajo impacto. Prioriza movilidad y ejercicios unilaterales.');
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

// ─────────────────────────────────────────────────────────────────────────────
// buildMealRules — solo cuando synergy está activa
// Calcula macros consumidos hoy vs targets del usuario y genera reglas de
// intensidad y tipo de ejercicio acordes a la disponibilidad energética real.
// ─────────────────────────────────────────────────────────────────────────────
function buildMealRules(user, mealContext, synergy) {
  if (!synergy || !mealContext || !mealContext.length) return '';

  // Sumar macros reales de todas las comidas del día
  let kcal = 0, carbs = 0, protein = 0, fat = 0, fiber = 0, sugar = 0;
  for (const meal of mealContext) {
    const ni = meal.nutritional_info || {};
    kcal    += Number(ni.total_calories) || 0;
    carbs   += Number(ni.total_carbs)    || 0;
    protein += Number(ni.total_protein)  || 0;
    fat     += Number(ni.total_fat)      || 0;
    fiber   += Number(ni.total_fiber)    || 0;
    sugar   += Number(ni.total_sugar)    || 0;
  }
  if (kcal === 0 && carbs === 0 && protein === 0) return '';

  const tKcal    = Number(user.calories_target) || 2000;
  const tProtein = Number(user.protein_target)  || 120;
  const tCarbs   = Number(user.carbs_target)    || 200;
  const goal     = (user.goal || '').toLowerCase();
  const weight   = Number(user.weight) || 75;

  const kcalPct  = kcal  / tKcal;
  const carbPct  = tCarbs > 0 ? carbs / tCarbs : carbs / 200;
  const protPct  = tProtein > 0 ? protein / tProtein : protein / 120;
  const protPerKg = protein / weight;  // g prot/kg peso

  // Detectar perfil de objetivo
  const wantsLoseWeight = goal.includes('perder') || goal.includes('quema') || goal.includes('déficit') || goal.includes('definir') || goal.includes('definición');
  const wantsMuscle     = goal.includes('músculo') || goal.includes('musculo') || goal.includes('volumen') || goal.includes('hipertrofia');
  const wantsPerformance = goal.includes('rendimiento') || goal.includes('competición') || goal.includes('competicion') || goal.includes('velocidad') || goal.includes('resistencia');
  const wantsMaintain   = goal.includes('mantener') || goal.includes('mantenimiento') || goal.includes('salud');

  const lines = [
    `\n\n🍽 NUTRICIÓN DE HOY — SINERGIA ACTIVA (adapta el entreno a estos datos reales):`,
    `  Consumido: ${Math.round(kcal)} kcal (${Math.round(kcalPct*100)}% objetivo) | ${Math.round(carbs)}g HC | ${Math.round(protein)}g prot (${protPerKg.toFixed(1)}g/kg) | ${Math.round(fat)}g grasa`,
    `  Objetivo diario: ${tKcal} kcal | ${tCarbs}g HC | ${tProtein}g prot`,
    `  Meta del usuario: ${user.goal || 'salud general'}`,
  ];

  const adaptRules = [];
  // nutrition_alert se generará en el JSON de respuesta — aquí solo las reglas de entreno

  // ════════════════════════════════════════════════════════════════════════
  // ESCENARIO 1: AYUNO / MUY POCA COMIDA (< 15% calorías)
  // ════════════════════════════════════════════════════════════════════════
  if (kcalPct < 0.15) {
    adaptRules.push('🚨 AYUNO CASI TOTAL (<15% calorías consumidas): PELIGRO. Solo entrenamiento de movilidad, stretching o caminata suave. PROHIBIDO cualquier ejercicio de alta o media intensidad. Riesgo real de lipotimia. nutrition_alert debe ser level:"danger".');
  }
  // ════════════════════════════════════════════════════════════════════════
  // ESCENARIO 2: QUEMA DE GRASA + POCOS HC (glucógeno bajo)
  // ════════════════════════════════════════════════════════════════════════
  else if (wantsLoseWeight && carbs < 60) {
    adaptRules.push('⚠ QUEMA DE GRASA + HC BAJOS (<60g): El cuerpo NECESITA algo de glucógeno para trabajar. Genera CARDIO ZONA 2 (50-65% FC máx) o fuerza de intensidad baja-media. El HIIT sin glucógeno puede catabolizar músculo. Duración máx 35 min. nutrition_alert level:"warning".');
  }
  // ════════════════════════════════════════════════════════════════════════
  // ESCENARIO 3: QUEMA DE GRASA + MUCHA GRASA INGERIDA
  // ════════════════════════════════════════════════════════════════════════
  else if (wantsLoseWeight && fat > 50 && carbPct < 0.4) {
    adaptRules.push('⚠ OBJETIVO DEFINICIÓN + ALTA INGESTA DE GRASA Y BAJOS HC: Hoy el perfil nutricional no es óptimo para quemar grasa eficientemente. Genera sesión de cardio aeróbico zona 2-3 (40-50 min a ritmo moderado). Evita HIIT y fuerza máxima — el cuerpo priorizará ácidos grasos pero el rendimiento será limitado. nutrition_alert level:"warning".');
  }
  // ════════════════════════════════════════════════════════════════════════
  // ESCENARIO 4: QUEMA DE GRASA + SUPERÁVIT (comió demasiado)
  // ════════════════════════════════════════════════════════════════════════
  else if (wantsLoseWeight && kcalPct > 1.15) {
    adaptRules.push('💡 OBJETIVO PÉRDIDA DE PESO + SUPERÁVIT CALÓRICO (>115%): Hoy has comido por encima del objetivo. Aumenta duración/volumen del entreno un 20%. Añade 10-15 min de cardio al final. Prioriza ejercicios compuestos de alto gasto energético. nutrition_alert level:"info".');
  }
  // ════════════════════════════════════════════════════════════════════════
  // ESCENARIO 5: GANAR MÚSCULO + PROTEÍNA INSUFICIENTE
  // ════════════════════════════════════════════════════════════════════════
  else if (wantsMuscle && protPct < 0.5) {
    adaptRules.push('⚠ OBJETIVO MÚSCULO + PROTEÍNA BAJA (<50% target o <1.2g/kg): Riesgo de catabolismo muscular si haces volumen alto. Sesión técnica y de fuerza moderada (4 series × 6-8 reps). Sin metabólicos ni circuitos de alta destrucción. Recuérdalo en coaching_tip. nutrition_alert level:"warning".');
  }
  // ════════════════════════════════════════════════════════════════════════
  // ESCENARIO 6: GANAR MÚSCULO + BUENA NUTRICIÓN
  // ════════════════════════════════════════════════════════════════════════
  else if (wantsMuscle && protPct >= 0.7 && kcalPct >= 0.8) {
    adaptRules.push('✅ OBJETIVO MÚSCULO + NUTRICIÓN ÓPTIMA: Proteína y calorías en rango. Genera sesión de fuerza/hipertrofia con volumen alto (4-5 series por grupo muscular). Puedes añadir superseries o drop sets. Aprovecha el superávit proteico.');
  }
  // ════════════════════════════════════════════════════════════════════════
  // ESCENARIO 7: RENDIMIENTO + HC BAJOS (peligroso para competición)
  // ════════════════════════════════════════════════════════════════════════
  else if (wantsPerformance && carbs < 80) {
    adaptRules.push('🚨 OBJETIVO RENDIMIENTO + GLUCÓGENO BAJO (<80g HC): En atletas de rendimiento esto es un error nutricional serio. Genera sesión técnica de baja intensidad. PROHIBIDO trabajo de velocidad, potencia o intervalos máximos. Si hay competición próxima, solo movilidad. nutrition_alert level:"danger".');
  }
  // ════════════════════════════════════════════════════════════════════════
  // ESCENARIO 8: RENDIMIENTO + BIEN CARGADO
  // ════════════════════════════════════════════════════════════════════════
  else if (wantsPerformance && carbPct >= 0.6 && protPct >= 0.6) {
    adaptRules.push('✅ RENDIMIENTO + CARGA NUTRICIONAL ÓPTIMA: Glucógeno y proteína disponibles. Genera sesión de alta intensidad (velocidad, potencia, intervalos). FC puede llegar a zona 4-5 en bloques cortos.');
  }
  // ════════════════════════════════════════════════════════════════════════
  // ESCENARIO 9: PERFIL CETOGÉNICO / MUY BAJA EN HC
  // ════════════════════════════════════════════════════════════════════════
  else if (fat > 60 && carbs < 50) {
    adaptRules.push('🫒 PERFIL CETOGÉNICO (alta grasa, bajos HC): El cuerpo opera con cetonas. Genera fuerza de baja-media intensidad o cardio aeróbico largo zona 2. El metabolismo anaeróbico (HIIT, sprint, pesos máximos) NO funciona bien sin glucógeno. Duración máx 45 min.');
  }
  // ════════════════════════════════════════════════════════════════════════
  // ESCENARIO 10: DÉFICIT MODERADO (30-60% calorías)
  // ════════════════════════════════════════════════════════════════════════
  else if (kcalPct < 0.60) {
    adaptRules.push('⚠ DÉFICIT CALÓRICO MODERADO (30-60% objetivo): Reduce volumen un 20-25%. Evita entrenos de destrucción máxima. Prioriza calidad sobre cantidad. Descansa más entre series.');
  }
  // ════════════════════════════════════════════════════════════════════════
  // ESCENARIO 11: AZÚCAR ALTO (digestión activa/pico glucémico)
  // ════════════════════════════════════════════════════════════════════════
  else if (sugar > 60 && kcalPct > 0.5) {
    adaptRules.push('💡 INGESTA ALTA DE AZÚCAR SIMPLE (>60g): Puede haber pico de insulina activo. Genera cardio moderado o fuerza estándar. Evita ejercicios abdominales intensos si la última comida fue hace <1h.');
  }
  // ════════════════════════════════════════════════════════════════════════
  // ESCENARIO 12: NUTRICIÓN EQUILIBRADA — SITUACIÓN ÓPTIMA
  // ════════════════════════════════════════════════════════════════════════
  else if (kcalPct >= 0.5 && kcalPct <= 1.1 && carbPct >= 0.4) {
    adaptRules.push('✅ NUTRICIÓN EQUILIBRADA: Macros y calorías en rango aceptable. Genera el entreno según nivel y deporte sin restricciones nutricionales adicionales.');
  }

  if (adaptRules.length) {
    lines.push('', ...adaptRules);
    lines.push('', '  ↳ INSTRUCCIÓN CLAVE: El campo "why_this_workout" DEBE explicar en 2-3 frases por qué este entreno específico es el adecuado dado el estado nutricional y el objetivo del usuario. El campo "post_workout_advice" DEBE dar consejos de comida concretos con alimentos, cantidades y timing post-entreno alineados con el objetivo.');
  }

  return lines.join('\n');
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
  // Reglas nutricionales solo cuando sinergia está activa
  const mealRules = buildMealRules(user, mealContext, synergy);

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
  ].filter(Boolean).join('\n\n');

  // ── CrossFit: prompt específico con WOD ──────────────────────────────────────
  if (activeSport === 'CrossFit') {
    const system = `Eres un coach CrossFit CF-L2. Genera WODs adaptativos, seguros y progresivos.${sessionRules}${mealRules}

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
  "summary": "string motivador 1-2 frases",
  "why_this_workout": "string — explica en 2-3 frases CONCRETAS por qué este entreno específico es el adecuado hoy dado el estado nutricional, físico y el objetivo del usuario. Si no hay sinergia activa, explica solo en base a nivel y deporte.",
  "nutrition_alert": null,
  "post_workout_advice": {
    "timing": "string — ej: 'Primeros 30 minutos post-entreno'",
    "explanation": "string — por qué estos alimentos específicamente dada la sesión de hoy y el objetivo",
    "foods": [
      {"name": "string", "quantity": "string", "reason": "string — qué aporta este alimento ahora"}
    ]
  }
}

REGLAS:
- difficulty DEBE ser exactamente "${resolvedLevel}"
- strength_block puede ser null
- time_cap OBLIGATORIO en For Time, Chipper, Hero WOD. null para AMRAP y EMOM.
- WOD con 3-5 movimientos máximo
- SIEMPRE incluir scaling para los 3 niveles
- why_this_workout: OBLIGATORIO, siempre explica el razonamiento del entreno de hoy
- nutrition_alert: null si todo está bien; {"level":"danger|warning|info","title":"string","message":"string explicativo de 1-2 frases"} si hay desajuste nutricional
- post_workout_advice: siempre con 2-4 alimentos específicos, cantidades reales y razón nutricional`;

    return chat(system, `Genera el WOD de CrossFit de hoy.\n\n${userCtx}`, 2500);
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

  const system = `Eres un preparador físico especialista en ${activeSport}. Genera una sesión de entrenamiento adaptada al nivel ${resolvedLevel}.${sessionRules}${mealRules}

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
  "summary": "string motivador 1-2 frases",
  "why_this_workout": "string — explica en 2-3 frases CONCRETAS por qué este entreno específico es el adecuado hoy dado el estado nutricional, físico y el objetivo. Si no hay sinergia activa, explica solo en base a nivel y deporte.",
  "nutrition_alert": null,
  "post_workout_advice": {
    "timing": "string — ej: 'Primeros 30 minutos post-entreno'",
    "explanation": "string — por qué estos alimentos específicamente dada la sesión de hoy y el objetivo",
    "foods": [
      {"name": "string", "quantity": "string", "reason": "string — qué aporta este alimento ahora"}
    ]
  }
}

REGLAS:
- Foco en ${sportHint}
- difficulty DEBE ser exactamente "${resolvedLevel}"
- exercises: 4-7 ejercicios relevantes para ${activeSport}
- warmup específico para los músculos y movimientos del ${activeSport}
- stretching post-sesión de los músculos más trabajados
- NO generes CrossFit ni WODs — genera entrenamiento de ${activeSport}
- why_this_workout: OBLIGATORIO — explica siempre el razonamiento del entreno de hoy
- nutrition_alert: null si todo bien; {"level":"danger|warning|info","title":"string","message":"string de 1-2 frases"} si hay desajuste
- post_workout_advice: 2-4 alimentos con cantidad real y razón nutricional concreta`;

  return chat(system, `Genera la sesión de ${activeSport} de hoy.\n\n${userCtx}`, 2500);
}

module.exports = { generateWorkout };
