const supabase = require('../db/supabase');

async function searchProducts(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // Full-text search first (Postgres tsvector)
  const { data: fts } = await supabase
    .from('custom_products')
    .select('*')
    .textSearch('search_terms', q, { type: 'plain', config: 'spanish' })
    .limit(20);

  if (fts && fts.length > 0) return fts;

  // Fallback: ilike on name
  const { data: ilike } = await supabase
    .from('custom_products')
    .select('*')
    .ilike('name', `%${q}%`)
    .limit(20);

  return ilike || [];
}

async function getByBarcode(barcode) {
  if (!barcode) return null;
  const { data } = await supabase
    .from('custom_products')
    .select('*')
    .eq('barcode', barcode)
    .single();
  return data || null;
}

async function addProduct(data) {
  const searchTerms = [data.name, data.brand].filter(Boolean).join(' ').toLowerCase();
  const { data: product, error } = await supabase
    .from('custom_products')
    .insert({
      barcode: data.barcode || null,
      name: data.name,
      brand: data.brand || null,
      quantity_str: data.quantity_str || null,
      nutritional_info: data.nutritional_info || {},
      source: data.source || 'manual',
      search_terms: searchTerms,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return product;
}

async function updateBarcodeByName(name, barcode) {
  if (!name || !barcode) return null;
  // Solo actualiza si el producto existe y no tiene barcode aún
  const { data, error } = await supabase
    .from('custom_products')
    .update({ barcode })
    .ilike('name', name.trim())
    .is('barcode', null)
    .select()
    .maybeSingle();
  if (error) console.warn('updateBarcodeByName:', error.message);
  return data || null;
}

module.exports = { searchProducts, getByBarcode, addProduct, updateBarcodeByName };
