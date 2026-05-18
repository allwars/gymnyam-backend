const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productController');

router.get('/search', ctrl.search);
router.get('/barcode/:barcode', ctrl.getByBarcode);
router.post('/', ctrl.addManual);

module.exports = router;
