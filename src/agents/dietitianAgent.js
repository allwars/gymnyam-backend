const { chat } = require('./client');

const DIET_RULES = {
  keto:                { label: 'Keto / Cetogénica',        macros: 'Grasa >70%, Proteína ~25%, Carbohidratos <5% (<25g/día)',                   forbidden: 'pan, arroz, pasta, patata, azúcar, fruta alta en azúcar, legumbres, cereales',                                                                                                                           allowed: 'carne, pescado, huevos, queso, mantequilla, aguacate, nueces, aceite de oliva, verduras de hoja verde', warning: null,                                                                                                                                                       meals_per_day: '2-3' },
  paleo:               { label: 'Paleo / Paleolítica',       macros: 'Alta proteína y grasa natural, sin procesados',                              forbidden: 'cereales, legumbres, lácteos, azúcar refinada, aceites refinados, alimentos procesados',                                                                                                                      allowed: 'carne, pescado, huevos, frutas, verduras, frutos secos, semillas, aceite de coco/oliva',                  warning: null,                                                                                                                                                       meals_per_day: '3' },
  intermittent_fasting:{ label: 'Ayuno Intermitente',        macros: 'Equilibrado dentro de la ventana de alimentación',                           forbidden: 'comer fuera de la ventana de ayuno activa',                                                                                                                                                                         allowed: 'todo dentro de la ventana: comida real y nutritiva',                                                       warning: 'El usuario está en ayuno intermitente. Respeta la ventana de alimentación indicada.',                                                                                meals_per_day: '2 (dentro de ventana)', fasting: true },
  low_carb:            { label: 'Baja en Carbohidratos',     macros: 'Carbos <100-150g/día, proteína alta, grasa moderada-alta',                   forbidden: 'azúcar, pan blanco, arroz blanco, pasta, patatas, refrescos',                                                                                                                                                allowed: 'carnes, pescado, huevos, verduras, lácteos enteros, frutos secos',                                         warning: null,                                                                                                                                                       meals_per_day: '3' },
  carnivore:           { label: 'Carnívora',                  macros: 'Solo productos animales. Cero carbohidratos.',                               forbidden: 'TODO lo vegetal: verduras, frutas, cereales, legumbres, frutos secos',                                                                                                                                        allowed: 'carne roja, pollo, cerdo, pescado, marisco, huevos, mantequilla, grasa animal, queso curado',              warning: null,                                                                                                                                                       meals_per_day: '2' },
  whole30:             { label: 'Whole30 (30 días)',          macros: 'Alimentos naturales completos, sin procesados',                              forbidden: 'azúcar de cualquier tipo, alcohol, cereales, legumbres, lácteos, aditivos, MSG, sulfitos',                                                                                                                      allowed: 'carne, marisco, huevos, verduras, frutas, grasas naturales, café negro, hierbas naturales',                warning: 'Dieta estricta de eliminación de 30 días. Sin excepciones.',                                                                                                 meals_per_day: '3' },
  dash:                { label: 'DASH',                       macros: 'Bajo en sodio (<2300mg/día), alto en potasio, magnesio y calcio',            forbidden: 'sal en exceso, embutidos, alimentos procesados salados, alcohol, grasas saturadas',                                                                                                                         allowed: 'frutas, verduras, lácteos bajos en grasa, cereales integrales, pescado, aves, legumbres, frutos secos',    warning: null,                                                                                                                                                       meals_per_day: '4-5 pequeñas' },
  flexitarian:         { label: 'Flexitariana',               macros: 'Mayormente vegetal, carne ocasional (1-2 veces/semana)',                     forbidden: 'exceso de carne roja, procesados ultraprocesados',                                                                                                                                                           allowed: 'vegetales, legumbres, cereales integrales, frutos secos, huevos, lácteos, pescado, carne con moderación', warning: null,                                                                                                                                                       meals_per_day: '3-4' },
  vegan:               { label: 'Vegana / Plant-Based',       macros: '100% vegetal. Proteína de legumbres, tofu, tempeh, semillas.',               forbidden: 'cualquier producto animal: carne, pescado, huevos, lácteos, miel',                                                                                                                                         allowed: 'verduras, frutas, legumbres, cereales, tofu, tempeh, seitán, frutos secos, semillas, leches vegetales',    warning: null,                                                                                                                                                       meals_per_day: '3-4' },
  gluten_free:         { label: 'Sin Gluten',                 macros: 'Normal, evitando gluten',                                                   forbidden: 'trigo, cebada, centeno, espelta, kamut y derivados (pan, pasta, cuscús, cerveza)',                                                                                                                           allowed: 'arroz, maíz, patata, quinoa, avena certificada sin gluten, carne, pescado, huevos, frutas, verduras',      warning: null,                                                                                                                                                       meals_per_day: '3' },
  zone:                { label: 'Zone Diet',                  macros: 'Cada comida: 40% carbos / 30% proteína / 30% grasa',                        forbidden: 'desequilibrio de macros, azúcar, grasas saturadas',                                                                                                                                                         allowed: 'proteínas magras, verduras de bajo IG, fruta, avena, aceite de oliva, frutos secos',                       warning: 'Cada sugerencia debe respetar el ratio 40/30/30 de carbos/proteína/grasa.',                                                                                  meals_per_day: '3 + 2 snacks' },
  metabolic_confusion: { label: 'Metabolic Confusion',        macros: 'Alterna días altos en calorías (~2500 kcal) y bajos (~1200 kcal)',           forbidden: 'monotonía calórica',                                                                                                                                                                                        allowed: 'todo, variando calorías según el ciclo del día',                                                           warning: null,                                                                                                                                                       meals_per_day: '3-5 según el día' },
  cabbage_soup:        { label: 'Dieta de la Sopa (Col)',     macros: 'Muy baja en calorías, 7 días con menú fijo por día',                        forbidden: 'alimentos fuera del menú del día',                                                                                                                                                                          allowed: 'sopa de col + alimentos específicos según el día (frutas / verduras / carne / arroz)',                      warning: 'Dieta muy restrictiva de 7 días. No recomendada más de una vez al mes.',                                                                                     meals_per_day: 'sopa ilimitada + complemento del día' },
  mayo_clinic:         { label: 'Mayo Clinic',                macros: 'Fase 1 (2 semanas): pierde hábitos malos. Fase 2: mantenimiento.',          forbidden: 'azúcar añadida, grasas saturadas, sal en exceso',                                                                                                                                                           allowed: 'frutas, verduras, cereales integrales, proteínas magras, lácteos bajos en grasa',                          warning: null,                                                                                                                                                       meals_per_day: '3' },
  mediterranean:       { label: 'Mediterránea',               macros: 'Equilibrada. Base en vegetales, aceite de oliva, pescado y legumbres.',     forbidden: 'procesados, azúcar refinada, grasas trans',                                                                                                                                                                 allowed: 'aceite de oliva, pescado azul, legumbres, verduras, frutas, cereales integrales, frutos secos',             warning: null,                                                                                                                                                       meals_per_day: '3' },
  atkins:              { label: 'Atkins',                     macros: 'Fase inducción: <20g carbos/día. Fases posteriores: incremento gradual.',   forbidden: 'azúcar, cereales, fruta (en fase 1), legumbres (en fase 1)',                                                                                                                                                 allowed: 'carne, pescado, huevos, queso, mantequilla, verduras bajas en carbos',                                     warning: null,                                                                                                                                                       meals_per_day: '3' },
  blood_type:          { label: 'Dieta tipo de sangre',       macros: 'Varía según tipo de sangre (A, B, AB, O)',                                  forbidden: 'alimentos inadecuados para su tipo de sangre',                                                                                                                                                              allowed: 'alimentos beneficiosos para su tipo de sangre',                                                            warning: 'Sin evidencia científica sólida. Adaptar al tipo de sangre indicado.',                                                                                       meals_per_day: '3' },
  alkaline:            { label: 'Dieta Alcalina',             macros: 'Alimentos alcalinos (pH>7). Evitar alimentos ácidos.',                      forbidden: 'carne roja, lácteos, azúcar, cafeína, alcohol, harina refinada',                                                                                                                                           allowed: 'frutas, verduras (especialmente verdes), frutos secos, legumbres, agua con limón',                         warning: null,                                                                                                                                                       meals_per_day: '3' },
  dairy_free:          { label: 'Sin Lácteos',                macros: 'Normal, evitando lácteos',                                                  forbidden: 'leche, yogur, queso, mantequilla, nata, helados, suero de leche',                                                                                                                                           allowed: 'leches vegetales (avena, soja, almendra), quesos veganos, aceite en lugar de mantequilla',                  warning: null,                                                                                                                                                       meals_per_day: '3' },
  fodmap:              { label: 'FODMAP (Colon Irritable)',   macros: 'Equilibrada, evitando FODMAPs',                                             forbidden: 'ajo, cebolla, trigo, legumbres, lácteos con lactosa, manzana, pera, sandía, brócoli, coliflor, champiñones',                                                                                               allowed: 'arroz, avena, plátano, zanahoria, pepino, patata, carne, pescado, huevos, lactosa-free',                    warning: null,                                                                                                                                                       meals_per_day: '3' },
  omad:                { label: 'OMAD (Una Comida al Día)',   macros: 'Toda la ingesta calórica en UNA sola comida. Ventana de 1 hora.',           forbidden: 'comer fuera de la ventana de 1 hora',                                                                                                                                                                       allowed: 'comida completa y nutritiva una vez al día',                                                               warning: 'Ventana de ayuno de 23 horas. Solo 1 comida al día.',                                                                                                        meals_per_day: '1', fasting: true },
  '5_2':               { label: '5:2',                        macros: '5 días: dieta normal. 2 días: máximo 500-600 kcal.',                        forbidden: 'superar 600 kcal en días de restricción',                                                                                                                                                                   allowed: 'todo en días normales. En días de restricción: verduras, proteína magra, caldo.',                           warning: 'Hoy puede ser día de restricción (500-600 kcal máx).',                                                                                                       meals_per_day: '3 (normales) / 2 muy pequeñas (restricción)', calorie_limit_fast_day: 600 },
  batch_cooking:       { label: 'Batch Cooking',              macros: 'Equilibrada, planificada semanalmente',                                     forbidden: 'nada específico',                                                                                                                                                                                           allowed: 'comida real preparada en cantidad. Recetas que se conserven bien 4-5 días.',                                warning: null,                                                                                                                                                       meals_per_day: '3', batch: true },
  raw_food:            { label: 'Crudívora (Raw Food)',       macros: 'Solo alimentos crudos o deshidratados por debajo de 47C',                   forbidden: 'cualquier alimento cocinado a más de 47C',                                                                                                                                                                  allowed: 'frutas, verduras crudas, germinados, frutos secos, semillas, zumos, smoothies',                            warning: null,                                                                                                                                                       meals_per_day: '3-4' },
  low_fodmap_sibo:     { label: 'Low-FODMAP estricta (SIBO)', macros: 'Igual que FODMAP pero versión muy estricta sin margen',                     forbidden: 'TODOS los FODMAPs: ajo, cebolla, lactosa, fructosa en exceso, polioles, galactanos, fructanos',                                                                                                           allowed: 'arroz blanco, patata, zanahoria, pepino, tomate pequeño, carne, pescado, huevos, aceite',                   warning: 'Versión estricta para SIBO. Sin excepciones.',                                                                                                               meals_per_day: '3' },
  anti_inflammatory:   { label: 'Antiinflamatoria',           macros: 'Rica en omega-3, antioxidantes y fibra',                                    forbidden: 'azúcar refinada, harinas blancas, aceites vegetales refinados, carnes procesadas, alcohol, comida frita',                                                                                                   allowed: 'pescado azul, frutas del bosque, cúrcuma, jengibre, verduras de hoja, aceite de oliva, frutos secos',       warning: null,                                                                                                                                                       meals_per_day: '3' },
  aip:                 { label: 'AIP (Protocolo Autoinmune)', macros: 'Eliminación estricta + reintroducción por fases',                           forbidden: 'cereales, legumbres, lácteos, huevos, solanáceas (tomate, pimiento, berenjenas), frutos secos, semillas, alcohol, café, aditivos',                                                                          allowed: 'carne, pescado, marisco, verduras (excepto solanáceas), frutas con moderación, aceite de coco/oliva',       warning: 'Dieta de eliminación muy estricta para enfermedades autoinmunes. Consultar con médico.',                                                                     meals_per_day: '3' },
  hcg:                 { label: 'Dieta HCG',                  macros: 'MUY baja en calorías: solo 500 kcal/día',                                  forbidden: 'grasas, azúcar, cualquier alimento calórico fuera del protocolo',                                                                                                                                           allowed: 'proteína magra (100g), verduras sin almidón, fruta baja en azúcar, tostadas Melba (2/día)',                 warning: 'ADVERTENCIA MEDICA: La dieta HCG (500 kcal/día) NO tiene respaldo científico y puede ser PELIGROSA.',        meals_per_day: '2 muy pequeñas', calorie_limit: 500 },
  military:            { label: 'Dieta Militar (3 días)',     macros: 'Muy baja en calorías durante 3 días (~1000 kcal)',                          forbidden: 'calorías extra fuera del menú establecido',                                                                                                                                                                 allowed: 'menú fijo: atún, huevo, manzana, tostada, queso cottage, brócoli, zanahoria, plátano, helado vainilla',     warning: 'Solo 3 días consecutivos. Luego 4 días de alimentación normal.',                                                                                             meals_per_day: '3 muy pequeñas', calorie_limit: 1000 },
  egg_diet:            { label: 'Dieta del Huevo',            macros: 'Muy restrictiva: huevos + proteína magra + pomelo',                         forbidden: 'carbohidratos, grasas añadidas, azúcar, cualquier alimento no incluido en el protocolo',                                                                                                                   allowed: 'huevos cocidos, pomelo, pollo/pescado a la plancha, agua, café/té sin azúcar',                              warning: 'Dieta extremadamente restrictiva. No recomendada más de 2 semanas.',                                                                                          meals_per_day: '3 muy pequeñas' },
};

function buildDietContext(user) {
  const diet = DIET_RULES[user.diet_type];
  if (!diet) return '';
  const lines = [
    'DIETA DEL USUARIO: ' + diet.label,
    'Macros objetivo: ' + diet.macros,
    'PROHIBIDO incluir: ' + diet.forbidden,
    'Permitido: ' + diet.allowed,
  ];
  if (diet.warning) lines.push('AVISO: ' + diet.warning);
  if (diet.fasting && user.diet_fasting_window) {
    lines.push('Ventana de alimentación: ' + user.diet_fasting_window);
    lines.push('NO sugieras comer fuera de esta ventana.');
  }
  if (diet.calorie_limit) lines.push('LIMITE CALORICO: ' + diet.calorie_limit + ' kcal totales en el día.');
  if (user.diet_phase) lines.push('Fase actual de la dieta: ' + user.diet_phase);
  if (user.diet_type === 'blood_type' && user.diet_blood_type) lines.push('Tipo de sangre: ' + user.diet_blood_type);
  lines.push('IMPORTANTE: Todas las sugerencias DEBEN cumplir estrictamente las restricciones de esta dieta.');
  return lines.join('\n');
}

/**
 * Genera el contexto de entrenamiento enriquecido para el prompt del dietista.
 * Antes solo se pasaba 'CrossFit'. Ahora incluye tipo, foco y duración.
 */
function buildSynergyCtx(w) {
  if (!w) return '';
  const focus = w.session_focus === 'strength'
    ? 'Día de FUERZA → priorizar proteína (2.0-2.2g/kg), carbos moderados post-entreno.'
    : w.session_focus === 'skill'
    ? 'Día de TÉCNICA/SKILL → proteína normal, carbos equilibrados.'
    : 'Día de METCON (alta intensidad) → priorizar carbohidratos de recuperación + proteína rápida post-entreno.';
  const parts = [
    'Entrenamiento de hoy: ' + (w.sport || 'CrossFit'),
    w.wod_type ? 'Tipo WOD: ' + w.wod_type : '',
    w.wod_format ? 'Formato: ' + w.wod_format : '',
    w.difficulty ? 'Intensidad: ' + w.difficulty : '',
    w.estimated_duration ? 'Duración: ' + w.estimated_duration : '',
    focus,
  ].filter(Boolean).join(' | ');
  return parts;
}

async function suggestMeal({ user, mealTime, pantry, mealHistory, synergy, workoutContext }) {
  const dietContext = buildDietContext(user);
  const diet = DIET_RULES[user.diet_type];
  const system = 'Eres un dietista experto en nutrición deportiva y dietas específicas.\n' +
    (dietContext ? 'RESTRICCIONES DE DIETA:\n' + dietContext : 'Dieta mediterránea estándar.') + '\n' +
    'Comidas al día para esta dieta: ' + (diet ? diet.meals_per_day : '3') + '.\n' +
    'Responde UNICAMENTE con JSON valido:\n{"suggestion":"string","foods":[{"name":"string","quantity":"string","calories":100,"protein":10,"carbs":20,"fat":5,"sugar":3}],"nutritional_info":{"total_calories":400,"total_protein":30,"total_carbs":50,"total_fat":10},"advice":"string","score":8,"diet_compliant":true}';
  const context = [
    'Perfil: objetivo ' + user.goal + ', peso ' + user.weight + 'kg, edad ' + user.age,
    user.allergies ? 'Alergias: ' + user.allergies : '',
    'Momento: ' + mealTime,
    pantry && pantry.length ? 'USA ESTOS ingredientes: ' + pantry.map(function(p){ return p.name + (p.quantity ? ' (' + p.quantity + ')' : ''); }).join(', ') : 'Sin despensa, sugiere algo simple.',
    synergy && workoutContext && workoutContext.length
      ? buildSynergyCtx(workoutContext[0])
      : '',
  ].filter(Boolean).join('\n');
  return chat(system, 'Sugiere qué comer ahora.\n' + context, 1000);
}

async function analyzeExternalMeal({ user, description, synergy, workoutContext }) {
  const dietContext = buildDietContext(user);
  const system = 'Eres un dietista experto. Analiza comidas y da su valor nutricional estimado.\n' +
    (dietContext ? 'DIETA DEL USUARIO:\n' + dietContext : '') + '\n' +
    'Responde UNICAMENTE con JSON valido:\n{"foods":[{"name":"string","quantity":"string","calories":100,"protein":10,"carbs":20,"fat":5,"fiber":2,"sugar":3,"has_preservatives":false}],"nutritional_info":{"total_calories":400,"total_protein":30,"total_carbs":50,"total_fat":10,"total_fiber":8,"total_sugar":12},"advice":"string","score":7,"diet_compliant":true,"diet_violations":[]}';
  const context = [
    'Perfil: objetivo ' + user.goal + ', peso ' + user.weight + 'kg',
    user.allergies ? 'Alergias: ' + user.allergies : '',
    'Comida a analizar: ' + description,
    synergy && workoutContext && workoutContext.length
      ? buildSynergyCtx(workoutContext[0])
      : '',
  ].filter(Boolean).join('\n');
  return chat(system, context, 800);
}

async function analyzePantry({ user, pantry, mealHistory }) {
  const dietContext = buildDietContext(user);
  const system = 'Eres un dietista experto. Analiza la despensa de un usuario.\n' +
    (dietContext ? 'DIETA DEL USUARIO:\n' + dietContext : '') + '\n' +
    'Responde UNICAMENTE con JSON valido:\n{"score":7,"summary":"string","strengths":["string"],"improvements":["string"],"diet_compatible_items":["string"],"diet_incompatible_items":["string"],"motivation":"string"}';
  const context = 'Objetivo: ' + user.goal + '\nAlimentos en despensa: ' + pantry.map(function(p){ return p.name; }).join(', ') + '\nComidas registradas: ' + (mealHistory ? mealHistory.length : 0);
  return chat(system, 'Analiza esta despensa.\n' + context, 600);
}

// ── Detecta la cocina dominante según los ingredientes de la despensa ──
function detectCuisine(pantry) {
  if (!pantry || !pantry.length) return 'mediterranean';
  const names = pantry.map(function(p) { return p.name.toLowerCase(); }).join(' ');

  const MEXICAN  = ['tortilla', 'chile', 'jalapeño', 'jalapeno', 'aguacate', 'cilantro', 'frijol', 'tomatillo', 'chipotle', 'guajillo', 'epazote', 'nopal', 'tamarindo', 'achiote'];
  const ORIENTAL = ['ramen', 'soja', 'salsa de soja', 'miso', 'tofu', 'nori', 'wasabi', 'sriracha', 'hoisin', 'udon', 'soba', 'mirin', 'sake', 'wonton', 'bok choy', 'kimchi', 'dashi', 'gyoza', 'edamame', 'tahini de sésamo', 'vinagre de arroz'];
  const INDIAN   = ['curry', 'garam masala', 'cúrcuma', 'naan', 'basmati', 'masala', 'cardamomo', 'ghee', 'dal', 'chutney', 'samosa', 'paneer', 'mostaza negra'];

  var mex = MEXICAN.filter(function(w)  { return names.includes(w); }).length;
  var ori = ORIENTAL.filter(function(w) { return names.includes(w); }).length;
  var ind = INDIAN.filter(function(w)   { return names.includes(w); }).length;

  if (mex >= 2) return 'mexican';
  if (ori >= 2) return 'oriental';
  if (ind >= 2) return 'indian';
  return 'mediterranean';
}

const CUISINE_STYLES = {
  mediterranean: {
    name: 'mediterránea española',
    prompt: 'COCINA MEDITERRÁNEA ESPAÑOLA: tortilla española, paella, gazpacho, sofrito, al ajillo, en escabeche, a la plancha, guisos de legumbres, ensalada, revuelto, croquetas. Solo platos reconocibles de la cocina española e italiana. PROHIBIDO inventar platos fusion o combinar ingredientes de culturas distintas.',
  },
  mexican: {
    name: 'mexicana',
    prompt: 'COCINA MEXICANA CLÁSICA: tacos, quesadillas, enchiladas, burritos, guacamole, chiles rellenos, arroz rojo, frijoles de olla, tostadas. SOLO platos mexicanos auténticos con los ingredientes disponibles. PROHIBIDO mezclar con ingredientes mediterráneos u otras cocinas.',
  },
  oriental: {
    name: 'oriental/asiática',
    prompt: 'COCINA ORIENTAL CLÁSICA: ramen, arroz frito al wok, gyozas, miso soup, pad thai, stir-fry de verduras, onigiri, fideos. SOLO platos asiáticos auténticos con los ingredientes disponibles. PROHIBIDO mezclar con ingredientes mediterráneos u otras cocinas.',
  },
  indian: {
    name: 'india',
    prompt: 'COCINA INDIA CLÁSICA: dal, curry de verduras o pollo, biryani, paneer, raita, chapati. SOLO platos indios auténticos con los ingredientes disponibles. PROHIBIDO mezclar con ingredientes de otras cocinas.',
  },
};

// ── Valida que los ingredientes del plato estén en la despensa ──
// Elimina los que no están (sal, aceite, agua y pimienta siempre permitidos)
function validateDishes(dishes, pantry) {
  const ALWAYS_OK = ['sal', 'aceite', 'agua', 'pimienta', 'vinagre'];
  const pantryNames = (pantry || []).map(function(p) { return p.name.toLowerCase(); });

  function isAllowed(ingredientName) {
    const lower = (ingredientName || '').toLowerCase();
    if (ALWAYS_OK.some(function(ok) { return lower.includes(ok); })) return true;
    // Match si el nombre del ingrediente contiene algún item de la despensa o viceversa
    return pantryNames.some(function(pn) {
      return lower.includes(pn) || pn.includes(lower);
    });
  }

  var validated = (dishes || [])
    .map(function(dish) {
      var filteredIngredients = (dish.ingredients || []).filter(function(ing) {
        return isAllowed(ing.name);
      });
      return Object.assign({}, dish, { ingredients: filteredIngredients });
    })
    .filter(function(dish) { return dish.ingredients && dish.ingredients.length > 0; });

  return validated;
}

async function suggestDishes({ user, mealTime, pantry, mealHistory, synergy, workoutContext }) {
  const dietContext = buildDietContext(user);
  const diet = DIET_RULES[user.diet_type];
  const cuisine = detectCuisine(pantry);
  const cuisineStyle = CUISINE_STYLES[cuisine];

  // Lista numerada de ingredientes — formato explícito para el modelo
  var pantryNumbered = null;
  var pantryNames = [];
  if (pantry && pantry.length) {
    pantryNames = pantry.map(function(p) { return p.name; });
    pantryNumbered = pantryNames.map(function(name, i) {
      return (i + 1) + '. ' + name;
    }).join('\n');
  }

  const system = [
    'Eres un cocinero experto en cocina ' + cuisineStyle.name + '.',
    '',
    '╔══════════════════════════════════════╗',
    '║  REGLA CRÍTICA — DESPENSA            ║',
    '╚══════════════════════════════════════╝',
    'Los ingredientes de CADA plato deben ser ÚNICAMENTE los de la lista de ingredientes permitidos.',
    'QUEDA TERMINANTEMENTE PROHIBIDO añadir cualquier ingrediente que NO aparezca en esa lista.',
    'Las únicas excepciones absolutas son: sal, aceite, agua y pimienta.',
    'Si un plato necesita un ingrediente que no está en la lista → NO sugieras ese plato.',
    'Si el plato solo puede hacerse con ingredientes de la lista → SÍ lo sugieras.',
    '',
    '══ ESTILO DE COCINA ══',
    cuisineStyle.prompt,
    '',
    '══ PLATOS ══',
    'Sugiere 3 platos REALES y CLÁSICOS de esta cocina usando los ingredientes disponibles.',
    'NO inventes platos nuevos. NO hagas fusión de cocinas.',
    '',
    dietContext ? '══ DIETA ══\n' + dietContext : '',
    'Comidas al día: ' + (diet ? diet.meals_per_day : 3) + '.',
    '',
    'Responde ÚNICAMENTE con este JSON válido (sin texto adicional):',
    '{"dishes":[{"name":"string","emoji":"string","description":"string","ingredients":[{"name":"string","quantity":"string","calories":100,"protein":10,"carbs":20,"fat":5,"fiber":2,"sugar":3,"has_preservatives":false}],"recipe_steps":["string"],"prep_time":"15 min","nutritional_info":{"total_calories":400,"total_protein":30,"total_carbs":50,"total_fat":10,"total_fiber":8,"total_sugar":12},"score":8,"uses_pantry":true,"diet_compliant":true}]}',
  ].filter(Boolean).join('\n');

  const context = [
    'Perfil: objetivo ' + user.goal + ', peso ' + user.weight + 'kg, edad ' + user.age + ', sexo ' + user.sex,
    user.allergies ? 'Alergias: ' + user.allergies : '',
    'Momento del día: ' + mealTime,
    pantryNumbered
      ? '═══ LISTA COMPLETA DE INGREDIENTES PERMITIDOS (Y SOLO ESTOS) ═══\n' + pantryNumbered + '\n═══════════════════════════════════════════════════════════════'
      : 'Sin despensa. Sugiere platos básicos de cocina ' + cuisineStyle.name + '.',
    mealHistory && mealHistory.length
      ? 'Evitar repetir: ' + mealHistory.slice(0,3).map(function(m) { return m.advice || (m.foods && m.foods[0] && m.foods[0].name); }).filter(Boolean).join(', ')
      : '',
    synergy && workoutContext && workoutContext.length
      ? buildSynergyCtx(workoutContext[0])
      : '',
  ].filter(Boolean).join('\n');

  var userMsg = '━━━ RECUERDA: usa ÚNICAMENTE los ingredientes de la lista. ━━━\n'
    + 'Sugiere 3 platos de cocina ' + cuisineStyle.name + '.\n' + context;

  // Temperatura 0 para máxima adherencia a las instrucciones
  var result = await chat(system, userMsg, 2000, 0);

  // Post-procesado: eliminar cualquier ingrediente no permitido que el modelo haya añadido
  if (result && result.dishes && pantry && pantry.length) {
    result.dishes = validateDishes(result.dishes, pantry);
  }

  return result;
}

function getDietInfo(dietType) {
  return DIET_RULES[dietType] || null;
}

function getAllDiets() {
  return Object.entries(DIET_RULES).map(function([id, d]) {
    return { id: id, label: d.label, meals_per_day: d.meals_per_day, fasting: !!d.fasting, calorie_limit: d.calorie_limit || null, warning: d.warning || null, batch: d.batch || false };
  });
}

module.exports = { suggestMeal, analyzeExternalMeal, analyzePantry, suggestDishes, getDietInfo, getAllDiets };
