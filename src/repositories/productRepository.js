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

  if (error) {
    // Barcode unique conflict — update instead
    if (error.code === '23505' && data.barcode) {
      return upsertFromOFF({ code: data.barcode, product_name: data.name, brands: data.brand }, data.nutritional_info);
    }
    throw new Error(error.message);
  }
  return product;
}

async function upsertFromOFF(offProduct, nutritionalInfo) {
  const barcode = offProduct.code || offProduct.barcode || null;
  const name = (offProduct.product_name || '').trim();
  if (!name) return null;

  const brand = offProduct.brands ? offProduct.brands.split(',')[0].trim() : null;
  const searchTerms = [name, brand].filter(Boolean).join(' ').toLowerCase();

  const record = {
    name,
    brand,
    quantity_str: offProduct.quantity || null,
    nutritional_info: nutritionalInfo || {},
    source: 'off',
    search_terms: searchTerms,
    updated_at: new Date().toISOString(),
  };

  if (barcode) {
    record.barcode = barcode;
    // Upsert on barcode conflict
    const { data, error } = await supabase
      .from('custom_products')
      .upsert({ ...record, barcode }, { onConflict: 'barcode' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  } else {
    // No barcode — try insert, ignore duplicate (same name may already exist)
    const { data, error } = await supabase
      .from('custom_products')
      .insert(record)
      .select()
      .single();
    if (error && error.code !== '23505') throw new Error(error.message);
    return data || null;
  }
}

module.exports = { searchProducts, getByBarcode, addProduct, upsertFromOFF };
