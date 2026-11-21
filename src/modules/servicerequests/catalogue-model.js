const mongoose = require('mongoose');

const catalogueSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  nameKey: { type: String, required: true, lowercase: true, trim: true, unique: true },
  seedKey: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
  description: { type: String, required: true, trim: true, maxlength: 300 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('ServiceCategory', catalogueSchema);
