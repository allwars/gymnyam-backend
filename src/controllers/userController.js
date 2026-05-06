const userService = require('../services/userService');

const VALID_DIETS = [
  'keto','paleo','intermittent_fasting','low_carb','carnivore','whole30',
  'dash','flexitarian','vegan','gluten_free','zone','metabolic_confusion',
  'cabbage_soup','mayo_clinic','mediterranean','atkins','blood_type',
  'alkaline','dairy_free','fodmap','omad','5_2','batch_cooking','raw_food',
  'low_fodmap_sibo','anti_inflammatory','aip','hcg','military','egg_diet',
];

function validateRegister(body) {
  const { name, email, age, weight, height } = body;
  if (!name?.trim()) return 'El nombre es obligatorio.';
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email invalido.';
  if (!age || isNaN(age) || age < 5 || age > 120) return 'Edad invalida (5-120).';
  if (!weight || isNaN(weight) || weight < 20 || weight > 500) return 'Peso invalido (20-500 kg).';
  if (!height || isNaN(height) || height < 50 || height > 250) return 'Altura invalida (50-250 cm).';
  if (!body.goal) return 'Selecciona un objetivo.';
  return null;
}

async function register(req, res) {
  try {
    const error = validateRegister(req.body);
    if (error) return res.status(400).json({ ok: false, error });
    const data = { ...req.body, email: req.body.email.trim().toLowerCase() };
    const user = await userService.createUser(data);
    res.status(201).json({ ok: true, user });
  } catch (err) {
    const isDuplicate = err.message?.includes('UNIQUE') || err.message?.includes('unique');
    res.status(400).json({ ok: false, error: isDuplicate ? 'Este email ya esta registrado. Usa Entrar para acceder.' : err.message });
  }
}

async function login(req, res) {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ ok: false, error: 'Email requerido.' });
    const user = await userService.getUserByEmail(email);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado.' });
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function getProfile(req, res) {
  try {
    const user = await userService.getUser(Number(req.params.id));
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function toggleSynergy(req, res) {
  try {
    const userId = Number(req.params.id);
    const { enabled } = req.body;
    const user = await userService.toggleSynergy(userId, enabled);
    res.json({
      ok: true, user,
      message: enabled
        ? 'Sinergia activada. Los beneficios se notan tras 2-4 semanas de constancia.'
        : 'Sinergia desactivada.',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function updateSports(req, res) {
  try {
    const userId = Number(req.params.id);
    const { sports } = req.body;
    if (!Array.isArray(sports)) return res.status(400).json({ ok: false, error: 'sports debe ser un array' });
    const user = await userService.updateSports(userId, sports);
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function updateGoal(req, res) {
  try {
    const userId = Number(req.params.id);
    const { goal } = req.body;
    if (!goal) return res.status(400).json({ ok: false, error: 'goal es obligatorio' });
    const user = await userService.updateGoal(userId, goal);
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = Number(req.params.id);
    const { name, age, sex, birth_date, weight, height, goal, sleep_hours, injuries, allergies } = req.body;
    if (height !== undefined && (isNaN(height) || height < 50 || height > 250))
      return res.status(400).json({ ok: false, error: 'Altura invalida (50-250 cm).' });
    if (weight !== undefined && (isNaN(weight) || weight < 20 || weight > 500))
      return res.status(400).json({ ok: false, error: 'Peso invalido (20-500 kg).' });
    const user = await userService.updateProfile(userId, { name, age, sex, birth_date, weight, height, goal, sleep_hours, injuries, allergies });
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function deleteAccount(req, res) {
  try {
    const userId = Number(req.params.id);
    await userService.deleteAccount(userId);
    res.json({ ok: true, message: 'Cuenta eliminada correctamente.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function updateDiet(req, res) {
  try {
    const userId = Number(req.params.id);
    const { diet_type, diet_fasting_window, diet_fasting_start, diet_phase, diet_blood_type } = req.body;

    if (diet_type && !VALID_DIETS.includes(diet_type))
      return res.status(400).json({ ok: false, error: `Dieta no valida: ${diet_type}` });

    let warning = null;
    if (diet_type === 'hcg')
      warning = 'La dieta HCG (500 kcal/dia) no tiene respaldo cientifico. Consulta a tu medico.';
    if (diet_type === 'egg_diet')
      warning = 'La dieta del huevo es muy restrictiva y no esta recomendada a largo plazo.';
    if (diet_type === 'military')
      warning = 'La dieta militar implica restriccion calorica severa 3 dias. No la hagas mas de 1 vez por semana.';
    if (diet_type === 'blood_type')
      warning = 'La dieta segun tipo de sangre no tiene evidencia cientifica solida.';

    const user = await userService.updateDiet(userId, { diet_type, diet_fasting_window, diet_fasting_start, diet_phase, diet_blood_type });
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    res.json({ ok: true, user, ...(warning ? { warning } : {}) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = { register, login, getProfile, toggleSynergy, updateSports, updateGoal, updateProfile, updateDiet, deleteAccount };
