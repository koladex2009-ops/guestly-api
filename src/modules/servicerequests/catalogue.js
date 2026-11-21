const Category = require('./catalogue-model');
const defaults = require('./defaults');
const AppError = require('../../utils/AppError');
const { record } = require('../auditlogs/service');

let seeding = null;

function keyOf(name) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

function serialize(category) {
  const item = category.toObject ? category.toObject() : category;
  return { id: String(item._id), name: item.name, description: item.description, active: item.active };
}

async function ensureDefaults() {
  if (!seeding) {
    seeding = Category.bulkWrite(defaults.map(item => ({
      updateOne: {
        filter: { seedKey: keyOf(item.name) },
        update: { $setOnInsert: { ...item, seedKey: keyOf(item.name), nameKey: keyOf(item.name), active: true } },
        upsert: true,
      },
    }))).catch(error => {
      seeding = null;
      throw error;
    });
  }
  await seeding;
}

async function list(manage = false) {
  await ensureDefaults();
  const filter = manage ? {} : { active: true };
  const rows = await Category.find(filter).sort({ name: 1 });
  return rows.map(serialize);
}

async function save(input, id, user) {
  await ensureDefaults();
  const name = input.name?.trim().replace(/\s+/g, ' ');
  const data = { ...input, ...(name ? { name, nameKey: keyOf(name) } : {}) };
  let result;
  if (id) {
    result = await Category.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!result) throw new AppError('Service category not found', 404);
  } else {
    result = await Category.create(data);
  }
  await record({ action: id ? 'service.catalogue.updated' : 'service.catalogue.created', actor: user._id, details: { category: result._id, name: result.name, active: result.active } });
  return serialize(result);
}

module.exports = { ensureDefaults, serialize, list, save, keyOf };
