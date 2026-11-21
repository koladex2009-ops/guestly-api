const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  pointsPerNight: { type: Number, required: true, min: 0, max: 10000 },
  effectiveAt: { type: Date, required: true, index: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('LoyaltyRule', ruleSchema);
