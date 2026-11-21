const mongoose = require('mongoose');

const conciergeSchema = new mongoose.Schema({
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  guestName: { type: String, required: true, maxlength: 160 },
  sender: { type: String, enum: ['guest', 'staff'], required: true },
  senderUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true, maxlength: 160 },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
}, { timestamps: true });

conciergeSchema.index({ guest: 1, createdAt: -1 });
module.exports = mongoose.model('ConciergeMessage', conciergeSchema);
