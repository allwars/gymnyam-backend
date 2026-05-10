const express = require('express');
const router = express.Router();
const { analyzeMeal, scanPantry, debugVision, analyzeProduct } = require('../controllers/visionController');

// POST /api/vision/product → analizar etiqueta de producto (sin userId)
router.post('/product', analyzeProduct);

// POST /api/vision/:userId/meal  → analizar foto de comida
router.post('/:userId/meal', analyzeMeal);

// POST /api/vision/:userId/pantry → escanear nevera y añadir a despensa
router.post('/:userId/pantry', scanPantry);

// POST /api/vision/debug → devuelve la respuesta RAW del modelo (solo para desarrollo)
router.post('/debug', debugVision);

module.exports = router;
