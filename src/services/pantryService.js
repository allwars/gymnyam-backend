const pantryRepo = require('../repositories/pantryRepository');

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

module.exports = { getAll, addItem, updateItem, deleteItem };
