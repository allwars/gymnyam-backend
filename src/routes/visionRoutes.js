const express = require('express');
const router = express.Router();
const { analyzeMeal, scanPantry } = require('../controllers/visionController');

// POST /api/vision/:userId/meal  → analizar foto de comida
router.post('/:userId/meal', analyzeMeal);

// POST /api/vision/:userId/pantry → escanear nevera y añadir a despensa
router.post('/:userId/pantry', scanPantry);

module.exports = router;
