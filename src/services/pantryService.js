const pantryRepo = require('../repositories/pantryRepository');
const { lookupFoodNutrition } = require('../agents/dietitianAgent');

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

  const nutrition = await lookupFoodNutrition({ foodName: item.name });

  const updatedItem = await pantryRepo.updateItem(itemId, userId, {
    nutritional_info: nutrition,
  });

  return updatedItem;
}

module.exports = { getAll, addItem, updateItem, deleteItem, lookupNutrition };
