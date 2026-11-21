const mongoose = require('mongoose');
const Payment = require('./model');
const AppError = require('../../utils/AppError');
const env = require('../../config/env');
const logger = require('../../config/logger');
const { record: recordAudit } = require('../auditlogs/service');
const { generateReference, initializeTransaction, verifyTransaction } = require('./paystack');

const initializePayment = async ({ bookingId, user }) => {
  const Booking = mongoose.model('Booking'); // Task A's model, looked up when called

  if (!mongoose.isValidObjectId(bookingId)) throw new AppError('Invalid booking id', 400);
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.guest.toString() !== user._id.toString()) throw new AppError('You cannot pay for this booking', 403);
  if (booking.status !== 'pending') throw new AppError(`Booking is ${booking.status} and cannot be paid`, 409);
  if (booking.expiresAt && booking.expiresAt <= new Date()) throw new AppError('This booking hold has expired', 409);
  if (!Number.isInteger(booking.totalAmount) || booking.totalAmount < 1) throw new AppError('Booking has an invalid amount', 500);

  const alreadyPaid = await Payment.exists({ booking: booking._id, status: 'success' });
  if (alreadyPaid) throw new AppError('This booking is already paid', 409);

  // The amount always comes from the booking in our database, never from the request
  const reference = generateReference();
  const payment = await Payment.create({
    booking: booking._id,
    guest: user._id,
    reference,
    amount: booking.totalAmount,
    currency: booking.currency || 'NGN',
  });
  await recordAudit({ action: 'payment.initialized', actor: user._id, booking: booking._id, payment: payment._id, details: { reference, amount: payment.amount } });

  try {
    const data = await initializeTransaction({
      email: user.email,
      amount: payment.amount,
      reference,
      callbackUrl: env.PAYSTACK_CALLBACK_URL,
      metadata: { bookingId: booking._id.toString(), paymentId: payment._id.toString() },
    });
    return { authorizationUrl: data.authorization_url, reference: data.reference, amount: payment.amount, currency: payment.currency };
  } catch (err) {
    logger.error('Paystack initialize failed', { reference, message: err.message });
    payment.status = 'failed';
    await payment.save();
    await recordAudit({ action: 'payment.initialize_failed', actor: user._id, booking: booking._id, payment: payment._id, details: { reference } });
    throw new AppError('Could not start the payment. Please try again.', 502);
  }
};

const processWebhook = async (event) => {
  if (!event || event.event !== 'charge.success') return { handled: false };
  const reference = event.data && event.data.reference;
  if (!reference) return { handled: false };

  const payment = await Payment.findOne({ reference });
  if (!payment) {
    logger.warn('Webhook for unknown reference', { reference });
    return { handled: false };
  }
  if (payment.status === 'success') return { handled: true, duplicate: true };

  // Never trust the webhook body alone: ask Paystack directly
  const tx = await verifyTransaction(reference);
  if (tx.status !== 'success') return { handled: false };
  if (tx.amount !== payment.amount || tx.currency !== payment.currency) {
    logger.error('Paystack amount or currency mismatch', { reference });
    await recordAudit({ action: 'payment.mismatch', booking: payment.booking, payment: payment._id, details: { reference, expected: payment.amount, received: tx.amount } });
    return { handled: false, mismatch: true };
  }

  const Booking = mongoose.model('Booking');
  const session = await mongoose.startSession();
  let paymentConfirmed = false;
  let bookingConfirmed = false;
  try {
    await session.withTransaction(async () => {
      paymentConfirmed = false;
      bookingConfirmed = false;
      const updated = await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $ne: 'success' } },
        { status: 'success', paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(), channel: tx.channel, gatewayResponse: tx },
        { session }
      );
      if (!updated) return; // another webhook got there first
      paymentConfirmed = true;
      const result = await Booking.updateOne(
        { _id: payment.booking, status: 'pending' },
        { status: 'confirmed', payment: payment._id },
        { session }
      );
      bookingConfirmed = result.modifiedCount > 0;
    });
  } catch (err) {
    if (err.code === 11000) {
      logger.error('Duplicate successful payment for booking', { reference });
      await recordAudit({ action: 'payment.duplicate_success', booking: payment.booking, payment: payment._id, details: { reference } });
      return { handled: true, needsRefund: true };
    }
    throw err;
  } finally {
    await session.endSession();
  }

  if (paymentConfirmed) {
    await recordAudit({ action: 'payment.succeeded', booking: payment.booking, payment: payment._id, details: { reference, amount: payment.amount } });
    if (bookingConfirmed) {
      await recordAudit({ action: 'booking.confirmed', booking: payment.booking, payment: payment._id });
    } else {
      // Money received but the booking was no longer pending (for example expired): needs a manual refund
      logger.error('Payment succeeded but booking was not pending', { reference });
      await recordAudit({ action: 'booking.confirm_failed', booking: payment.booking, payment: payment._id, details: { reference } });
    }
  }
  return { handled: true };
};

// Lets the frontend check a payment. If it is still pending, it asks Paystack once.
const getPaymentStatus = async ({ reference, user }) => {
  let payment = await Payment.findOne({ reference });
  if (!payment) throw new AppError('Payment not found', 404);
  const isOwner = payment.guest.toString() === user._id.toString();
  if (!isOwner && !['staff', 'manager'].includes(user.role)) throw new AppError('Payment not found', 404);

  if (payment.status === 'pending') {
    try {
      await processWebhook({ event: 'charge.success', data: { reference } });
      payment = await Payment.findOne({ reference });
    } catch (err) {
      logger.warn('Payment status check failed', { reference, message: err.message });
    }
  }
  return {
    reference: payment.reference,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    booking: payment.booking,
    paidAt: payment.paidAt,
  };
};

const listPayments = async ({ filter = {}, page = 1, limit = 20 }) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit),
    Payment.countDocuments(filter),
  ]);
  return { items, total, page: safePage, limit: safeLimit };
};

module.exports = { initializePayment, processWebhook, getPaymentStatus, listPayments };