
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },

    guest: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true,
  index: true,
},

    reference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

   amount: {
  type: Number,
  required: true,
  min: 1,
  validate: {
    validator: Number.isInteger,
    message: 'amount must be an integer in kobo',
  },
},

    currency: {
      type: String,
      default: 'NGN',
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'abandoned', 'refunded'],
      default: 'pending',
      index: true,
    },

    channel: {
      type: String,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    gatewayResponse: {
  type: mongoose.Schema.Types.Mixed,
  default: null,
  select: false,
},
  },
  {
    timestamps: true,
  }
);

paymentSchema.index(
  { booking: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'success' } }
);

module.exports = mongoose.model('Payment', paymentSchema);
