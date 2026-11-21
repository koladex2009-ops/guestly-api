const mongoose = require('mongoose');

const roomKeySchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  checkIn: { type: mongoose.Schema.Types.ObjectId, ref: 'CheckIn', required: true },
  nonce: { type: String, required: true, select: false },
  issuedAt: { type: Date, required: true, default: Date.now },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('RoomKey', roomKeySchema);
