const mongoose = require('mongoose');

const historicalSchema = new mongoose.Schema({
  source: { type: String, enum: ['bookings', 'guests', 'payments', 'service-requests'], required: true },
  rowKey: { type: String, required: true },
  sourceId: { type: String, required: true },
  sourceRow: { type: Number, required: true, min: 1 },
  hash: { type: String, required: true, minlength: 64, maxlength: 64 },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  importedAt: { type: Date, required: true, default: Date.now },
}, { collection: 'historical_records', versionKey: false });

historicalSchema.index({ source: 1, rowKey: 1 }, { unique: true });
historicalSchema.index({ source: 1, sourceRow: 1 }, { unique: true });
historicalSchema.index({ source: 1, sourceId: 1 });
module.exports = mongoose.model('HistoricalRecord', historicalSchema);
