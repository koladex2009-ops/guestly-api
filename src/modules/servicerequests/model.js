const mongoose = require('mongoose');

const transitionSchema = new mongoose.Schema({
  status: { type: String, enum: ['received', 'in-progress', 'done'], required: true },
  at: { type: Date, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { _id: false });

const serviceRequestSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  guestName: { type: String, required: true, maxlength: 160 },
  roomName: { type: String, required: true, maxlength: 120 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
  categoryName: { type: String, required: true, maxlength: 60 },
  details: { type: String, default: '', maxlength: 500 },
  status: { type: String, enum: ['received', 'in-progress', 'done'], default: 'received', index: true },
  history: { type: [transitionSchema], default: [] },
}, { timestamps: true });

serviceRequestSchema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
