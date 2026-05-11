const workoutService = require('../services/workoutService');
const workoutRepo = require('../repositories/workoutRepository');

async function generate(req, res) {
  try {
    const userId = Number(req.params.userId);
    const { level, checkin } = req.body;
    const workout = await workoutService.generateAndSave({ userId, level, checkin });
    res.json({ ok: true, workout });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function getHistory(req, res) {
  try {
    const userId = Number(req.params.userId);
    const limit = Number(req.query.limit) || 20;
    const history = await workoutService.getHistory(userId, limit);
    res.json({ ok: true, history });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function saveNotes(req, res) {
  try {
    const workoutId = Number(req.params.workoutId);
    const { notes } = req.body;
    const workout = await workoutService.saveNotes(workoutId, notes);
    res.json({ ok: true, workout });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function deleteWorkout(req, res) {
  try {
    const workoutId = Number(req.params.workoutId);
    const userId = Number(req.query.userId);
    const deleted = await workoutRepo.deleteWorkout(workoutId, userId);
    if (!deleted) return res.status(404).json({ ok: false, error: 'Entreno no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function updateWorkout(req, res) {
  try {
    const workoutId = Number(req.params.workoutId);
    const userId = Number(req.query.userId);
    const { exercises, warmup, stretching, notes } = req.body;
    const workout = await workoutService.updateWorkout(workoutId, userId, { exercises, warmup, stretching, notes });
    if (!workout) return res.status(404).json({ ok: false, error: 'Entreno no encontrado' });
    res.json({ ok: true, workout });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = { generate, getHistory, saveNotes, deleteWorkout, updateWorkout };
