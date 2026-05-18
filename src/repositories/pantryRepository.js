const supabase = require('../db/supabase');

async function addItem(data) {
  const { data: item, error } = await supabase
    .from('pantry')
    .insert({
      user_id: data.user_id,
      name: data.name,
      quantity: data.quantity || null,
      nutritional_info: data.nutritional_info || {},
      added_by: data.added_by || 'manual',
    })
    .select().single();
  if (error) throw new Error(error.message);
  return item;
}

async function getItemById(id) {
  const { data, error } = await supabase.from('pantry').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data;
}

async function getPantryByUser(userId) {
  const { data, error } = await supabase
    .from('pantry').select('*').eq('user_id', userId).order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

async function deleteItem(id, userId) {
  await supabase.from('pantry').delete().eq('id', id).eq('user_id', userId);
}

async function updateItem(id, userId, data) {
  const update = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.quantity !== undefined) update.quantity = data.quantity;
  if (data.nutritional_info !== undefined) update.nutritional_info = data.nutritional_info;
  if (!Object.keys(update).length) return getItemById(id);
  const { data: item, error } = await supabase
    .from('pantry').update(update).eq('id', id).eq('user_id', userId).select().single();
  if (error) throw new Error(error.message);
  return item;
}

module.exports = { addItem, getItemById, getPantryByUser, deleteItem, updateItem };
