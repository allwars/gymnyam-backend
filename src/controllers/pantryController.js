const pantryService = require('../services/pantryService');

async function getAll(req, res) {
  try {
    const userId = Number(req.params.userId);
    const items = await pantryService.getAll(userId);
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function addItem(req, res) {
  try {
    const userId = Number(req.params.userId);
    const result = await pantryService.addItem(userId, req.body);

    // Producto ya existe en la despensa del usuario
    if (result?.duplicate) {
      return res.status(409).json({
        ok: false,
        duplicate: true,
        existing_item: result.existing_item,
        error: 'duplicate',
      });
    }

    res.status(201).json({ ok: true, item: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function updateItem(req, res) {
  try {
    const userId = Number(req.params.userId);
    const itemId = Number(req.params.itemId);
    const item = await pantryService.updateItem(userId, itemId, req.body);
    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function deleteItem(req, res) {
  try {
    const userId = Number(req.params.userId);
    const itemId = Number(req.params.itemId);
    await pantryService.deleteItem(userId, itemId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function lookupNutrition(req, res) {
  try {
    const userId = Number(req.params.userId);
    const itemId = Number(req.params.itemId);
    const item = await pantryService.lookupNutrition(userId, itemId);
    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function uploadImage(req, res) {
  try {
    const userId = Number(req.params.userId);
    const itemId = Number(req.params.itemId);
    const item   = await pantryService.uploadImage(userId, itemId, req.file);
    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = { getAll, addItem, updateItem, deleteItem, lookupNutrition, uploadImage };
