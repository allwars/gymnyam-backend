const productRepo = require('../repositories/productRepository');

async function search(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ ok: true, products: [] });
    const products = await productRepo.searchProducts(q);
    res.json({ ok: true, products });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function getByBarcode(req, res) {
  try {
    const { barcode } = req.params;
    const product = await productRepo.getByBarcode(barcode);
    res.json({ ok: true, product: product || null });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

async function addManual(req, res) {
  try {
    const { name, brand, quantity_str, nutritional_info, barcode } = req.body;
    if (!name?.trim()) return res.status(400).json({ ok: false, error: 'Nombre requerido' });
    const product = await productRepo.addProduct({
      name: name.trim(), brand, quantity_str, nutritional_info, barcode, source: 'manual',
    });
    res.json({ ok: true, product });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = { search, getByBarcode, addManual };
