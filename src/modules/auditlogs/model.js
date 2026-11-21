const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true }, // e.g. payment.succeeded
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null, index: true },
    details: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);