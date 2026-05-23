const userRepo = require('../repositories/userRepository');
const analytics = require('../repositories/analyticsRepository');

async function createUser(data) {
  const { sports, ...userData } = data;
  const user = await userRepo.createUser(userData);
  if (sports && Array.isArray(sports)) {
    for (const sport of sports) {
      await userRepo.addSport(user.id, sport);
      if (sport.name) analytics.incrementSport(sport.name);
    }
  }
  if (userData.diet_type) analytics.incrementDiet(userData.diet_type);
  return userRepo.getUserById(user.id);
}

async function getUser(userId) { return userRepo.getUserById(userId); }
async function getUserByEmail(email) { return userRepo.getUserByEmail(email); }
async function toggleSynergy(userId, enabled) { return userRepo.updateSynergy(userId, enabled); }
async function updateSports(userId, sports) { return userRepo.updateSports(userId, sports); }
async function updateGoal(userId, goal) { return userRepo.updateGoal(userId, goal); }
async function updateProfile(userId, data) { return userRepo.updateProfile(userId, data); }

async function updateDiet(userId, dietData) {
  const oldUser = await userRepo.getUserById(userId);
  if (oldUser?.diet_type && oldUser.diet_type !== dietData.diet_type) {
    analytics.decrementDiet(oldUser.diet_type);
  }
  const user = await userRepo.updateDiet(userId, dietData);
  if (dietData.diet_type) analytics.incrementDiet(dietData.diet_type);
  return user;
}

async function deleteAccount(userId) { return userRepo.deleteUser(userId); }
async function getHealthImports(userId, limit) { return userRepo.getHealthImports(userId, limit); }

module.exports = { createUser, getUser, getUserByEmail, toggleSynergy, updateSports, updateGoal, updateProfile, updateDiet, deleteAccount, getHealthImports };
