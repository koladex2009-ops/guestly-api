const mongoose = require('mongoose');
const Payment = require('./model');
const AppError = require('../../utils/AppError');
const { generateReference, initializeTransaction, verifyTransaction } = require('./paystack');
const logger = require('../../config/logger');

const initializePayment = async ({ bookingId, user }) => {
  // Looked up when called, so it works once Task A's Booking model exists
  const Booking = mongoose.model('Booking');

  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError('Invalid booking id', 400);
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  if (booking.guest.toString() !== user._id.toString()) {
    throw new AppError('You cannot pay for this booking', 403);
  }
  if (booking.status !== 'pending') {
    throw new AppError(`Booking is ${booking.status} and cannot be paid`, 409);
  }
  if (booking.expiresAt && booking.expiresAt <= new Date()) {
    throw new AppError('This booking hold has expired', 409);
  }
  if (!Number.isInteger(booking.totalAmount) || booking.totalAmount < 1) {
    throw new AppError('Booking has an invalid amount', 500);
  }

  const alreadyPaid = await Payment.exists({ booking: booking._id, status: 'success' });
  if (alreadyPaid) throw new AppError('This booking is already paid', 409);

  // Amount comes from the booking in our database, never from the request
  const reference = generateReference();
  const payment = await Payment.create({
    booking: booking._id,
    guest: user._id,
    reference,
    amount: booking.totalAmount,
    currency: booking.currency || 'NGN',
  });

  try {
    const data = await initializeTransaction({
      email: user.email,
      amount: payment.amount,
      reference,
      metadata: {
        bookingId: booking._id.toString(),
        paymentId: payment._id.toString(),
      },
    });
    return {
      authorizationUrl: data.authorization_url,
      reference: data.reference,
      amount: payment.amount,
      currency: payment.currency,
    };
  } catch (err) {
    payment.status = 'failed';
    await payment.save();
    throw new AppError('Could not start the payment. Please try again.', 502);
  }
};

const processWebhook = async (event) => {
  // Only successful charges matter here. Anything else is acknowledged and ignored.
  if (!event || event.event !== 'charge.success') return { handled: false };
  const reference = event.data && event.data.reference;
  if (!reference) return { handled: false };

  const payment = await Payment.findOne({ reference });
  if (!payment) {
    logger.warn('Webhook for unknown reference', { reference });
    return { handled: false };
  }
  // Duplicate webhook: already processed, do nothing
  if (payment.status === 'success') return { handled: true, duplicate: true };

  // Never trust the webhook body alone: ask Paystack directly
  const tx = await verifyTransaction(reference);
  if (tx.status !== 'success') return { handled: false };
  if (tx.amount !== payment.amount || tx.currency !== payment.currency) {
    logger.error('Paystack amount or currency mismatch', { reference });
    return { handled: false, mismatch: true };
  }

  const Booking = mongoose.model('Booking');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $ne: 'success' } },
        {
          status: 'success',
          paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(),
          channel: tx.channel,
          gatewayResponse: tx,
        },
        { session }
      );
      if (!updated) return; // another webhook got there first

      const result = await Booking.updateOne(
        { _id: payment.booking, status: 'pending' },
        { status: 'confirmed', payment: payment._id },
        { session }
      );
      if (result.modifiedCount === 0) {
        // Money was received but the booking is no longer pending (for example, expired)
        logger.error('Payment succeeded but booking was not pending', { reference });
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      // A second successful payment for the same booking: needs a manual refund
      logger.error('Duplicate successful payment for booking', { reference });
      return { handled: true, needsRefund: true };
    }
    throw err;
  } finally {
    await session.endSession();
  }
  return { handled: true };
};

module.exports = { initializePayment, processWebhook };