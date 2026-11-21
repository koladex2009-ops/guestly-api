const mongoose = require('mongoose');

const awardSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roomName: { type: String, required: true },
  checkoutDate: { type: String, required: true },
  nights: { type: Number, required: true, min: 1, max: 365 },
  pointsPerNight: { type: Number, required: true, min: 0, max: 10000 },
  points: { type: Number, required: true, min: 0 },
  paidPayment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
  awardedAt: { type: Date, default: Date.now, required: true },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

awardSchema.index({ guest: 1, awardedAt: -1 });
module.exports = mongoose.model('LoyaltyAward', awardSchema);
