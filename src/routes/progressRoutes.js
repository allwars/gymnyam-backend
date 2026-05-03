const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/progressController');

router.post('/:userId/workout/:workoutId', ctrl.analyzeWorkoutProgress);
router.get('/:userId/calendar', ctrl.getCalendarMonth);
router.get('/:userId/week', ctrl.getWeekSummary);

module.exports = router;
