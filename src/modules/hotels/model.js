const mongoose = require('mongoose');
const hotelDefaults = require('./defaults');

const hotelSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, enum: ['primary'], default: 'primary' },
  name: { type: String, required: true, trim: true, maxlength: 80, default: hotelDefaults.name },
  tagline: { type: String, required: true, trim: true, maxlength: 160, default: hotelDefaults.tagline },
  description: { type: String, required: true, trim: true, maxlength: 1200, default: hotelDefaults.description },
  location: { type: String, required: true, trim: true, maxlength: 160, default: hotelDefaults.location },
  currency: { type: String, enum: ['NGN'], default: 'NGN' },
  heroImage: { type: String, required: true, default: hotelDefaults.heroImage },
}, { timestamps: true });

module.exports = mongoose.model('Hotel', hotelSchema);
