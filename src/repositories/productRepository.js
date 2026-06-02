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
  if (!data) return null;

  // Calcular score si no está almacenado (productos del import masivo)
  const ni = data.nutritional_info || {};
  if (ni.score == null && ni.calories_per_100g) {
    const nova       = ni.off_nova;
    const nutriscore = ni.off_nutriscore;
    const protein    = ni.protein_per_100g  || 0;
    const fiber      = ni.fiber_per_100g    || 0;
    const sugar      = ni.sugar_per_100g    || 0;
    const fat        = ni.fat_per_100g      || 0;
    const calories   = ni.calories_per_100g || 0;
    const hasPreserv = ni.has_preservatives ||
      (ni.off_ecodes?.some(e => /^E2\d\d$/i.test(e)) ?? false);

    let base = nova === 1 ? 88 : nova === 2 ? 72 : nova === 3 ? 52 : nova === 4 ? 28 : 62;
    if (protein > 20)       base = Math.min(base + 5, 100);
    if (fiber > 5)          base = Math.min(base + 4, 100);
    if (sugar > 20)         base = Math.max(base - 10, 0);
    if (calories > 400)     base = Math.max(base - 5,  0);
    if (hasPreserv)         base = Math.max(base - 8,  0);
    if (nutriscore === 'A') base = Math.min(base + 6, 100);
    if (nutriscore === 'B') base = Math.min(base + 3, 100);
    if (nutriscore === 'D') base = Math.max(base - 5,  0);
    if (nutriscore === 'E') base = Math.max(base - 10, 0);

    const score = Math.round(base);
    const score_label = score >= 80 ? 'Excelente' : score >= 65 ? 'Bueno'
                      : score >= 45 ? 'Aceptable' : 'Limitado';

    data.nutritional_info = { ...ni, score, score_label, has_preservatives: hasPreserv };
  }

  return data;
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
