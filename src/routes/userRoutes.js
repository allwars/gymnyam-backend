const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/:id', ctrl.getProfile);
router.patch('/:id/synergy', ctrl.toggleSynergy);
router.patch('/:id/sports', ctrl.updateSports);
router.patch('/:id/goal', ctrl.updateGoal);
router.patch('/:id/profile', ctrl.updateProfile);
router.patch('/:id/diet', ctrl.updateDiet);
router.get('/:id/tdee', ctrl.getTDEE);
router.get('/:id/webhook-token', ctrl.getWebhookToken);
router.post('/:id/webhook-token', ctrl.generateWebhookToken);
router.get('/:id/health-imports', ctrl.getHealthImports);
router.delete('/:id', ctrl.deleteAccount);

module.exports = router;
