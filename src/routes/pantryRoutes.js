const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const ctrl    = require('../controllers/pantryController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/:userId', ctrl.getAll);
router.post('/:userId', ctrl.addItem);
router.patch('/:userId/:itemId', ctrl.updateItem);
router.delete('/:userId/:itemId', ctrl.deleteItem);
router.post('/:userId/:itemId/nutrition', ctrl.lookupNutrition);
router.post('/:userId/:itemId/image', upload.single('image'), ctrl.uploadImage);

module.exports = router;
