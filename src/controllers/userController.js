const userService = require('../services/userService');

function validateRegister(body) {
  const { name, email, age, weight, height } = body;
  if (!name?.trim()) return 'El nombre es obligatorio.';
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email inválido.';
  if (!age || isNaN(age) || age < 5 || age > 120) return 'Edad inválida (5-120).';
  if (!weight || isNaN(weight) || weight < 20 || weight > 500) return 'Peso inválido (20-500 kg).';
  if (!height || isNaN(height) || height < 50 || height > 250) return 'Altura inválida (50-250 cm).';
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
    const isDuplicate = err.message?.includes('duplicate') || err.message?.includes('unique') || err.message?.includes('UNIQUE');
    res.status(400).json({ ok: false, error: isDuplicate ? 'Este email ya está registrado. Usa "Entrar" para acceder.' : err.message });
  }
}

async function login(req, res) {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ ok: false, error: 'Email requerido.' });
    const user = await userService.getUserByEmail(email);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado. ¿Primera vez? Crea tu cuenta.' });
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
    const { name, age, sex, weight, height, goal, sleep_hours, injuries, allergies } = req.body;
    if (height !== undefined && (isNaN(height) || height < 50 || height > 250)) {
      return res.status(400).json({ ok: false, error: 'Altura inválida (50-250 cm).' });
    }
    if (weight !== undefined && (isNaN(weight) || weight < 20 || weight > 500)) {
      return res.status(400).json({ ok: false, error: 'Peso inválido (20-500 kg).' });
    }
    const user = await userService.updateProfile(userId, { name, age, sex, weight, height, goal, sleep_hours, injuries, allergies });
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = { register, login, getProfile, toggleSynergy, updateSports, updateGoal, updateProfile };
