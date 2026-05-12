/**
 * tdeeService.js
 * Calcula el TDEE (Total Daily Energy Expenditure) del usuario.
 * Fórmula: Harris-Benedict revisada (Mifflin-St Jeor) + factor de actividad CrossFit.
 * Sin dependencias externas — puro cálculo.
 */

// Factor de actividad según frecuencia de entrenos CrossFit
const ACTIVITY_FACTORS = {
  Principiante: 1.375,  // ligero: 1-2 días/semana
  Intermedio:   1.55,   // moderado: 3-4 días/semana
  Avanzado:     1.725,  // intenso: 5-6 días/semana
};

// Ajuste calórico según objetivo
const GOAL_ADJUSTMENTS = {
  'perder peso':      -300,
  'adelgazar':        -300,
  'definición':       -200,
  'definicion':       -200,
  'mantener':            0,
  'mantenimiento':       0,
  'salud general':       0,
  'ganar músculo':    +250,
  'ganar musculo':    +250,
  'volumen':          +300,
  'rendimiento':      +150,
  'performance':      +150,
};

/**
 * Calcula el TDEE del usuario.
 * @param {object} user - Objeto de usuario con age, sex, weight, height, goal, sports
 * @returns {object} { bmr, tdee, target, protein_g, carbs_g, fat_g, level, goal_label }
 */
function calculateTDEE(user) {
  const weight = parseFloat(user.weight) || 70;
  const height = parseFloat(user.height) || 170;
  const age    = parseInt(user.age)     || 30;
  const sex    = (user.sex || '').toLowerCase();

  // Mifflin-St Jeor BMR
  const bmr = sex === 'mujer' || sex === 'female' || sex === 'f'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  // Nivel CrossFit para el factor de actividad
  const cfSport = (user.sports || []).find(s => s.name === 'CrossFit');
  const level   = cfSport?.level || user.level || 'Intermedio';
  const actFactor = ACTIVITY_FACTORS[level] || ACTIVITY_FACTORS['Intermedio'];

  const tdee = Math.round(bmr * actFactor);

  // Ajuste por objetivo
  const goalLower = (user.goal || '').toLowerCase();
  let goalAdjust = 0;
  for (const [key, val] of Object.entries(GOAL_ADJUSTMENTS)) {
    if (goalLower.includes(key)) { goalAdjust = val; break; }
  }
  const target = tdee + goalAdjust;

  // Macros recomendados (gramos) para CrossFit
  // Proteína: 2.0g/kg | Grasa: 25% de calorías | Resto: carbohidratos
  const protein_g = Math.round(weight * 2.0);
  const fat_g     = Math.round((target * 0.25) / 9);
  const carbs_g   = Math.round((target - protein_g * 4 - fat_g * 9) / 4);

  return {
    bmr:         Math.round(bmr),
    tdee,
    target:      Math.max(target, 1200), // nunca por debajo de 1200 kcal
    protein_g,
    carbs_g:     Math.max(carbs_g, 0),
    fat_g,
    level,
    goal_label:  user.goal || 'salud general',
  };
}

module.exports = { calculateTDEE };
