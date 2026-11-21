const User = require('./model');
const AppError = require('../../utils/AppError');

const teamRoles = ['staff', 'manager'];

function publicUser(user) {
  return {
    id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    isActive: user.isActive,
  };
}

async function listTeam() {
  const users = await User.find({ role: { $in: teamRoles } }).sort({ firstName: 1, lastName: 1 });
  return users.map(publicUser);
}

async function createTeam({ firstName, lastName, email, password, role }) {
  const exists = await User.findOne({ email });
  if (exists) throw new AppError('Email is already registered', 409);
  const user = await User.create({ firstName, lastName, email, password, role, isActive: true });
  return publicUser(user);
}

async function changeTeamAccess(id, { role, isActive }) {
  const user = await User.findOneAndUpdate(
    { _id: id, role: { $in: teamRoles } },
    { $set: { role, isActive }, $inc: { sessionVersion: 1 } },
    { new: true, runValidators: true },
  );
  if (!user) throw new AppError('Team account not found', 404);
  return publicUser(user);
}

module.exports = { publicUser, listTeam, createTeam, changeTeamAccess };
