const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  status: { type: String, enum: ['pending', 'approved', 'rejected'], required: true },
  at: { type: Date, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { _id: false });

const checkInSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  guestName: { type: String, required: true },
  roomName: { type: String, required: true },
  checkIn: { type: String, required: true },
  checkOut: { type: String, required: true },
  arrivalTime: { type: String, required: true },
  documentKind: { type: String, enum: ['Passport', 'National ID', "Driver's licence"], required: true },
  documentMime: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true, select: false },
  documentEncrypted: { type: Buffer, required: true, select: false },
  documentIv: { type: Buffer, required: true, select: false },
  documentTag: { type: Buffer, required: true, select: false },
  documentDeleteAt: { type: Date, required: true, index: true },
  documentDeletedAt: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], required: true, default: 'pending', index: true },
  submittedAt: { type: Date, required: true, default: Date.now },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewNote: { type: String, default: '', maxlength: 300 },
  history: { type: [historySchema], default: [] },
}, { timestamps: true });

checkInSchema.index({ status: 1, submittedAt: 1 });

module.exports = mongoose.model('CheckIn', checkInSchema);
