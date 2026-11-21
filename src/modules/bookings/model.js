const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  requestId: { type: String, required: true, trim: true },
  roomSlug: { type: String, required: true },
  roomName: { type: String, required: true },
  guestName: { type: String, required: true },
  checkIn: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  checkOut: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  guests: { type: Number, required: true, min: 1, max: 3 },
  quantity: { type: Number, required: true, default: 1, min: 1, max: 1 },
  nightlyRate: { type: Number, required: true, min: 1 },
  totalAmount: { type: Number, required: true, min: 100 },
  currency: { type: String, required: true, enum: ['NGN'], default: 'NGN' },
  status: { type: String, required: true, enum: ['pending', 'confirmed', 'expired', 'cancelled'], default: 'pending', index: true },
  expiresAt: { type: Date, required: true, index: true },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  latestPaymentReference: { type: String, default: '' },
}, { timestamps: true });

bookingSchema.index({ guest: 1, requestId: 1 }, { unique: true });
bookingSchema.index({ room: 1, status: 1, checkIn: 1, checkOut: 1, expiresAt: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
