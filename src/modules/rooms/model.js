const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  category: { type: String, enum: ['Standard', 'Deluxe', 'Executive'], required: true },
  image: { type: String, required: true, maxlength: 600 },
  nightlyRate: { type: Number, required: true, min: 1, max: 100000000 },
  capacity: { type: Number, required: true, min: 1, max: 3 },
  size: { type: Number, required: true, min: 1 },
  bed: { type: String, required: true, trim: true, maxlength: 80 },
  view: { type: String, required: true, trim: true, maxlength: 80 },
  amenities: [{ type: String, trim: true, maxlength: 80 }],
  description: { type: String, required: true, trim: true, maxlength: 1200 },
  inventory: { type: Number, required: true, min: 0, max: 1000 },
  featured: { type: Boolean, default: false },
  bookingsRevision: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
