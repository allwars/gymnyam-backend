const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/workoutController');

router.post('/:userId/generate', ctrl.generate);
router.get('/:userId/history', ctrl.getHistory);
router.patch('/:workoutId/notes', ctrl.saveNotes);
router.patch('/:workoutId', ctrl.updateWorkout);
router.delete('/:workoutId', ctrl.deleteWorkout);

module.exports = router;
