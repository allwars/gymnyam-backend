const userRepo = require('../repositories/userRepository');

async function createUser(data) {
  const { sports, ...userData } = data;
  const user = await userRepo.createUser(userData);
  if (sports && Array.isArray(sports)) {
    for (const sport of sports) await userRepo.addSport(user.id, sport);
  }
  return userRepo.getUserById(user.id);
}

async function getUser(userId) {
  return userRepo.getUserById(userId);
}

async function getUserByEmail(email) {
  return userRepo.getUserByEmail(email);
}

async function toggleSynergy(userId, enabled) {
  return userRepo.updateSynergy(userId, enabled);
}

async function updateSports(userId, sports) {
  return userRepo.updateSports(userId, sports);
}

async function updateGoal(userId, goal) {
  return userRepo.updateGoal(userId, goal);
}

async function updateProfile(userId, data) {
  return userRepo.updateProfile(userId, data);
}

module.exports = { createUser, getUser, getUserByEmail, toggleSynergy, updateSports, updateGoal, updateProfile };
