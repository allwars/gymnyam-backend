const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pantryController');

router.get('/:userId', ctrl.getAll);
router.post('/:userId', ctrl.addItem);
router.patch('/:userId/:itemId', ctrl.updateItem);
router.delete('/:userId/:itemId', ctrl.deleteItem);
router.post('/:userId/:itemId/nutrition', ctrl.lookupNutrition);

module.exports = router;
