const analytics = require('../repositories/analyticsRepository');
const { getAllDiets } = require('../agents/dietitianAgent');
const path = require('path');

async function getStats(req, res) {
  try {
    const stats = analytics.getAllStats();
    res.json({ ok: true, stats });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function getDietsList(req, res) {
  try {
    res.json({ ok: true, diets: getAllDiets() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function getDashboard(req, res) {
  try {
    res.sendFile(path.join(__dirname, '../views/admin-dashboard.html'));
  } catch (err) {
    res.status(500).send('Error cargando dashboard');
  }
}

module.exports = { getStats, getDietsList, getDashboard };
