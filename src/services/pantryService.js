const pantryRepo = require('../repositories/pantryRepository');
const { chat }   = require('../agents/client');
const supabase   = require('../db/supabase');

/**
 * Calcula la puntuación nutricional (0–100) a partir de los macros.
 * Fórmula consistente con offToNutritionalInfo en el cliente.
 * Se usa para los alimentos estimados por IA (sin datos NOVA/Nutriscore).
 */
function computeNutritionScore(result) {
  const protein         = result.protein_per_100g  || 0;
  const fiber           = result.fiber_per_100g    || 0;
  const sugar           = result.sugar_per_100g    || 0;
  const fat             = result.fat_per_100g      || 0;
  const calories        = result.calories_per_100g || 0;
  const hasPreservatives = result.has_preservatives || false;

  let base = 65; // base sin datos NOVA

  // Proteína
  if (protein > 25)      base += 10;
  else if (protein > 15) base += 6;
  else if (protein > 8)  base += 2;

  // Fibra
  if (fiber > 6)      base += 8;
  else if (fiber > 3) base += 4;

  // Azúcar (penalización progresiva)
  if (sugar > 25)      base -= 15;
  else if (sugar > 15) base -= 8;
  else if (sugar > 8)  base -= 4;

  // Grasa muy alta (solo penaliza si excede mucho)
  if (fat > 35)      base -= 8;
  else if (fat > 25) base -= 4;

  // Calorías
  if (calories > 550)      base -= 10;
  else if (calories > 400) base -= 5;
  else if (calories < 60)  base += 5;

  // Conservantes / aditivos
  if (hasPreservatives) base -= 8;

  const score = Math.max(15, Math.min(100, Math.round(base)));
  const score_label = score >= 80 ? 'Excelente'
    : score >= 65 ? 'Bueno'
    : score >= 45 ? 'Aceptable'
    : 'Limitado';

  return { score, score_label };
}

const BUCKET = 'images';

async function getAll(userId) {
  return pantryRepo.getPantryByUser(userId);
}

async function addItem(userId, data) {
  return pantryRepo.addItem({ user_id: userId, ...data });
}

async function updateItem(userId, itemId, data) {
  const item = await pantryRepo.updateItem(itemId, userId, data);
  // Propagar datos a custom_products en background (sin bloquear respuesta)
  if (item?.name && data.nutritional_info) {
    enrichCustomProduct(item.name, data.nutritional_info).catch(() => {});
  }
  return item;
}

// Enriquece custom_products con los datos reales aportados por el usuario en pantry
async function enrichCustomProduct(name, ni) {
  if (!name || !ni) return;

  // Buscar el producto por nombre (case-insensitive)
  const { data: cp } = await supabase
    .from('custom_products')
    .select('id, barcode, nutritional_info')
    .ilike('name', name.trim())
    .maybeSingle();

  if (!cp) return; // producto no existe en custom_products, nada que enriquecer

  const updates = {};

  // Barcode — solo si no tiene
  if (!cp.barcode && ni.off_barcode) {
    updates.barcode = ni.off_barcode;
  }

  // Macros — solo los campos que custom_products no tiene aún
  const cpNi = cp.nutritional_info || {};
  const macroFields = [
    'calories_per_100g', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g',
    'fiber_per_100g', 'sugar_per_100g', 'saturated_fat_per_100g', 'salt_per_100g',
    'score', 'score_label', 'off_nova', 'off_nutriscore',
  ];
  const newNi = { ...cpNi };
  let niChanged = false;
  for (const field of macroFields) {
    if (cpNi[field] == null && ni[field] != null) {
      newNi[field] = ni[field];
      niChanged = true;
    }
  }
  // Imagen — solo si no tiene URL de supabase storage
  if (ni.off_image?.includes('supabase.co/storage') &&
      !cpNi.off_image?.includes('supabase.co/storage')) {
    newNi.off_image = ni.off_image;
    niChanged = true;
  }

  if (niChanged) updates.nutritional_info = newNi;

  if (Object.keys(updates).length === 0) return;

  await supabase
    .from('custom_products')
    .update(updates)
    .eq('id', cp.id);
}

async function deleteItem(userId, itemId) {
  return pantryRepo.deleteItem(itemId, userId);
}

async function lookupNutrition(userId, itemId) {
  const item = await pantryRepo.getItemById(itemId);
  if (!item || item.user_id !== userId) throw new Error('Alimento no encontrado');

  const system = 'Eres un experto en nutrición. Devuelve ÚNICAMENTE JSON válido con los valores nutricionales estimados por 100g del alimento indicado, incluyendo puntuación estilo Yuka.\n' +
    'Formato exacto:\n' +
    '{"calories_per_100g":100,"protein_per_100g":5,"carbs_per_100g":20,"fat_per_100g":3,"fiber_per_100g":2,"sugar_per_100g":4,"has_preservatives":false,"score":75,"score_label":"Bueno",' +
    '"positive_points":[{"icon":"💪","label":"Alta proteína","description":"Favorece la musculación y recuperación","value":"20g/100g","color":"green"}],' +
    '"negative_points":[{"icon":"🍬","label":"Azúcar moderado","description":"Cantidad aceptable pero a vigilar","value":"4g/100g","color":"orange"}]}';

  const result = await chat(system, `Valores nutricionales por 100g de: ${item.name}`, 800);

  // Calcular score con fórmula propia (no confiar en el score subjetivo de la IA)
  const computed = computeNutritionScore({
    protein_per_100g:  result.protein_per_100g,
    fiber_per_100g:    result.fiber_per_100g,
    sugar_per_100g:    result.sugar_per_100g,
    fat_per_100g:      result.fat_per_100g,
    calories_per_100g: result.calories_per_100g,
    has_preservatives: result.has_preservatives,
  });

  const nutritional_info = {
    calories_per_100g:  result.calories_per_100g  ?? null,
    protein_per_100g:   result.protein_per_100g   ?? null,
    carbs_per_100g:     result.carbs_per_100g      ?? null,
    fat_per_100g:       result.fat_per_100g        ?? null,
    fiber_per_100g:     result.fiber_per_100g      ?? null,
    sugar_per_100g:     result.sugar_per_100g      ?? null,
    has_preservatives:  result.has_preservatives   ?? null,
    score:              computed.score,
    score_label:        computed.score_label,
    positive_points:    result.positive_points     || [],
    negative_points:    result.negative_points     || [],
  };

  return pantryRepo.updateItem(itemId, userId, { nutritional_info });
}

async function uploadImage(userId, itemId, file) {
  if (!file) throw new Error('No se recibió ningún archivo');
  const item = await pantryRepo.getItemById(itemId);
  if (!item || item.user_id !== userId) throw new Error('Alimento no encontrado');

  const ext  = file.mimetype === 'image/png' ? 'png' : 'jpg';
  const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const path = `user_${userId}_${slug}_${itemId}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const nutritional_info = { ...(item.nutritional_info || {}), off_image: publicUrl };
  const updated = await pantryRepo.updateItem(itemId, userId, { nutritional_info });
  enrichCustomProduct(item.name, { off_image: publicUrl }).catch(() => {});
  return updated;
}

module.exports = { getAll, addItem, updateItem, deleteItem, lookupNutrition, uploadImage };
