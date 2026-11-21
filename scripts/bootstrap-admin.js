const mongoose = require('mongoose');
const env = require('../src/config/env');
const User = require('../src/modules/users/model');

async function bootstrap() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  const firstName = (process.env.BOOTSTRAP_ADMIN_FIRST_NAME || 'Guestly').trim();
  const lastName = (process.env.BOOTSTRAP_ADMIN_LAST_NAME || 'Admin').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 72) {
    throw new Error('A valid BOOTSTRAP_ADMIN_EMAIL and 12-72 character BOOTSTRAP_ADMIN_PASSWORD are required');
  }
  await mongoose.connect(env.MONGODB_URI);
  if (await User.exists({ role: 'admin' })) throw new Error('A super-admin account already exists');
  if (await User.exists({ email })) throw new Error('The email is already registered');
  await User.create({ firstName, lastName, email, password, role: 'admin', isActive: true });
  process.stdout.write('Super-admin account created\n');
}

bootstrap()
  .catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; })
  .finally(async () => { await mongoose.disconnect(); });
