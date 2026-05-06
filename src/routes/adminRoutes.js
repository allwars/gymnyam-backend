const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');

router.get('/stats', ctrl.getStats);
router.get('/diets', ctrl.getDietsList);
router.get('/dashboard', ctrl.getDashboard);

module.exports = router;
