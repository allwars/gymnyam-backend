const pantryRepo = require('../repositories/pantryRepository');
const { chat } = require('../agents/client');

async function getAll(userId) {
  return pantryRepo.getPantryByUser(userId);
}

async function addItem(userId, data) {
  return pantryRepo.addItem({ user_id: userId, ...data });
}

async function updateItem(userId, itemId, data) {
  return pantryRepo.updateItem(itemId, userId, data);
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

  const nutritional_info = {
    calories_per_100g: result.calories_per_100g ?? null,
    protein_per_100g: result.protein_per_100g ?? null,
    carbs_per_100g: result.carbs_per_100g ?? null,
    fat_per_100g: result.fat_per_100g ?? null,
    fiber_per_100g: result.fiber_per_100g ?? null,
    sugar_per_100g: result.sugar_per_100g ?? null,
    has_preservatives: result.has_preservatives ?? null,
    score: result.score ?? null,
    score_label: result.score_label ?? null,
    positive_points: result.positive_points || [],
    negative_points: result.negative_points || [],
  };

  return pantryRepo.updateItem(itemId, userId, { nutritional_info });
}

module.exports = { getAll, addItem, updateItem, deleteItem, lookupNutrition };
