const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mealController');

router.post('/:userId/suggest', ctrl.suggest);
router.post('/:userId/dishes', ctrl.getDishSuggestions);
router.post('/:userId/confirm-dish', ctrl.confirmDish);
router.post('/:userId/external', ctrl.analyzeExternal);
router.get('/:userId/history', ctrl.getHistory);
router.get('/:userId/pantry-analysis', ctrl.getPantryAnalysis);
router.patch('/:mealId', ctrl.updateMeal);
router.delete('/:mealId', ctrl.deleteMeal);

module.exports = router;
