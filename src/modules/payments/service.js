const mongoose = require('mongoose');
const Payment = require('./model');
const Booking = require('../bookings/model');
const AppError = require('../../utils/AppError');
const env = require('../../config/env');
const logger = require('../../config/logger');
const { record } = require('../auditlogs/service');
const { generateReference, initializeTransaction, verifyTransaction, createRefund } = require('./paystack');

const completed = ['success', 'refund_required', 'refunded'];

function safeCheckoutUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'paystack.com' || url.hostname.endsWith('.paystack.com')) && !url.username && !url.password;
  } catch {
    return false;
  }
}

async function initializePayment({ bookingId, user }) {
  if (!env.PAYSTACK_SECRET_KEY || !env.PAYSTACK_CALLBACK_URL) throw new AppError('Payment service is not configured', 503);
  if (!mongoose.isValidObjectId(bookingId)) throw new AppError('Invalid booking id', 400);
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);
  if (String(booking.guest) !== String(user._id)) throw new AppError('You cannot pay for this booking', 403);
  if (booking.status !== 'pending') throw new AppError('Only pending reservations can be paid', 409);
  if (!booking.expiresAt || booking.expiresAt <= new Date()) throw new AppError('This booking hold has expired', 409);
  if (!Number.isSafeInteger(booking.totalAmount) || booking.totalAmount < 100) throw new AppError('Booking amount is invalid', 500);
  if (await Payment.exists({ booking: booking._id, status: 'success' })) throw new AppError('Booking is already paid', 409);

  const earlier = await Payment.findOne({ booking: booking._id, status: 'pending' }).sort({ createdAt: -1 });
  if (earlier && safeCheckoutUrl(earlier.authorizationUrl)) {
    return {
      bookingId: String(booking._id),
      authorizationUrl: earlier.authorizationUrl,
      reference: earlier.reference,
      amount: earlier.amount,
      currency: earlier.currency,
      expiresAt: booking.expiresAt,
    };
  }

  const reference = generateReference();
  const payment = await Payment.create({
    booking: booking._id,
    guest: user._id,
    reference,
    amount: booking.totalAmount,
    currency: booking.currency,
  });
  await record({ action: 'payment.initialized', actor: user._id, booking: booking._id, payment: payment._id, details: { reference, amount: payment.amount } });

  try {
    const gateway = await initializeTransaction({
      email: user.email,
      amount: payment.amount,
      reference,
      callbackUrl: env.PAYSTACK_CALLBACK_URL,
      metadata: { bookingId: String(booking._id), paymentId: String(payment._id) },
    });
    if (!gateway || gateway.reference !== reference || !safeCheckoutUrl(gateway.authorization_url)) {
      throw new Error('Invalid payment gateway response');
    }
    payment.authorizationUrl = gateway.authorization_url;
    await payment.save();
    await Booking.updateOne({ _id: booking._id, status: 'pending' }, { $set: { latestPaymentReference: reference } });
    return {
      bookingId: String(booking._id),
      authorizationUrl: gateway.authorization_url,
      reference,
      amount: payment.amount,
      currency: payment.currency,
      expiresAt: booking.expiresAt,
    };
  } catch (error) {
    logger.error('Paystack initialize failed', { reference, message: error.message });
    payment.status = 'failed';
    await payment.save();
    await record({ action: 'payment.initialize_failed', actor: user._id, booking: booking._id, payment: payment._id, details: { reference } });
    throw new AppError('Unable to start the payment. Please retry.', 502);
  }
}

async function reconcileCharge(reference) {
  const payment = await Payment.findOne({ reference });
  if (!payment) return { handled: false };
  if (completed.includes(payment.status)) return { handled: true, duplicate: true, status: payment.status };

  const transaction = await verifyTransaction(reference);
  if (!transaction || transaction.status !== 'success') {
    if (['failed', 'abandoned'].includes(transaction?.status)) {
      await Payment.updateOne({ _id: payment._id, status: 'pending' }, { $set: { status: transaction.status } });
      await record({ action: 'payment.' + transaction.status, booking: payment.booking, payment: payment._id, details: { reference } });
    }
    return { handled: false, status: transaction?.status || 'pending' };
  }
  if (transaction.reference !== reference || transaction.amount !== payment.amount || transaction.currency !== payment.currency) {
    await Payment.updateOne(
      { _id: payment._id, status: { $in: ['pending', 'failed', 'abandoned'] } },
      { $set: { status: 'review_required' } },
    );
    await record({
      action: 'payment.mismatch', booking: payment.booking, payment: payment._id,
      details: { reference, expectedAmount: payment.amount, receivedAmount: transaction.amount, expectedCurrency: payment.currency, receivedCurrency: transaction.currency },
    });
    return { handled: false, reviewRequired: true };
  }

  const session = await mongoose.startSession();
  let outcome = 'duplicate';
  try {
    await session.withTransaction(async () => {
      const bookingUpdate = await Booking.updateOne(
        { _id: payment.booking, status: 'pending', expiresAt: { $gt: new Date() } },
        { $set: { status: 'confirmed', payment: payment._id } },
        { session },
      );
      const status = bookingUpdate.modifiedCount ? 'success' : 'refund_required';
      const paidAt = transaction.paid_at ? new Date(transaction.paid_at) : new Date();
      const paymentUpdate = await Payment.updateOne(
        { _id: payment._id, status: { $in: ['pending', 'failed', 'abandoned', 'review_required'] } },
        { $set: { status, paidAt, channel: transaction.channel || null } },
        { session },
      );
      if (!paymentUpdate.modifiedCount) throw new AppError('Payment reconciliation must be retried', 409);
      outcome = status;
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const paidAt = transaction.paid_at ? new Date(transaction.paid_at) : new Date();
    await Payment.updateOne(
      { _id: payment._id, status: { $in: ['pending', 'failed', 'abandoned', 'review_required'] } },
      { $set: { status: 'refund_required', paidAt, channel: transaction.channel || null } },
    );
    outcome = 'refund_required';
  } finally {
    await session.endSession();
  }
  if (outcome === 'success') {
    await record({ action: 'payment.succeeded', booking: payment.booking, payment: payment._id, details: { reference, amount: payment.amount } });
    await record({ action: 'booking.confirmed', booking: payment.booking, payment: payment._id });
  } else if (outcome === 'refund_required') {
    logger.error('Verified payment cannot be applied to an active booking hold', { reference });
    await record({ action: 'payment.refund_required', booking: payment.booking, payment: payment._id, details: { reference } });
  }
  return { handled: true, status: outcome, needsRefund: outcome === 'refund_required' };
}

async function reconcileRefund(event) {
  const data = event.data || {};
  const reference = data.transaction?.reference || data.transaction_reference ||
    (typeof data.transaction === 'string' ? data.transaction : '');
  if (!reference) return { handled: false };
  const payment = await Payment.findOne({ reference });
  if (!payment || payment.refundStatus === 'none') return { handled: false };
  const next = event.event.slice('refund.'.length);
  const valid = ['pending', 'processing', 'processed', 'failed'];
  if (!valid.includes(next)) return { handled: false };
  if (payment.refundStatus === 'processed') return { handled: true, duplicate: true };
  const patch = { refundStatus: next };
  if (next === 'processed') patch.status = 'refunded';
  const updated = await Payment.updateOne(
    { _id: payment._id, refundStatus: { $ne: 'processed' } },
    { $set: patch },
  );
  if (updated.modifiedCount) await record({ action: 'refund.' + next, booking: payment.booking, payment: payment._id, details: { reference } });
  return { handled: true, status: next };
}

async function processWebhook(event) {
  if (!event || typeof event.event !== 'string') return { handled: false };
  if (event.event.startsWith('refund.')) return reconcileRefund(event);
  if (event.event !== 'charge.success' || !event.data?.reference) return { handled: false };
  return reconcileCharge(event.data.reference);
}

async function getPaymentStatus({ reference, user }) {
  let payment = await Payment.findOne({ reference });
  if (!payment) throw new AppError('Payment not found', 404);
  const owned = String(payment.guest) === String(user._id);
  if (!owned && !['staff', 'manager'].includes(user.role)) throw new AppError('Payment not found', 404);
  if (['pending', 'failed', 'abandoned'].includes(payment.status)) {
    try {
      await reconcileCharge(reference);
      payment = await Payment.findOne({ reference });
    } catch (error) {
      logger.warn('Payment status check failed', { reference, message: error.message });
    }
  }
  const booking = await Booking.findById(payment.booking);
  return {
    reference: payment.reference,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    booking: String(payment.booking),
    bookingStatus: booking?.status || 'unknown',
    paidAt: payment.paidAt,
    refundStatus: payment.refundStatus,
    needsRefund: payment.status === 'refund_required',
  };
}

async function listPayments({ filter = {}, page = 1, limit = 30 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit),
    Payment.countDocuments(filter),
  ]);
  return {
    items: items.map(payment => ({
      id: String(payment._id), bookingId: String(payment.booking), reference: payment.reference,
      amount: payment.amount, currency: payment.currency, status: payment.status,
      refundStatus: payment.refundStatus, paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    })),
    total, page: safePage, limit: safeLimit,
  };
}

async function requestRefund({ reference, user }) {
  const payment = await Payment.findOneAndUpdate(
    { reference, status: 'refund_required', refundStatus: { $in: ['none', 'failed'] } },
    { $set: { refundStatus: 'requested', refundRequestedAt: new Date() } },
    { new: true },
  );
  if (!payment) throw new AppError('No eligible payment requiring a refund was found', 409);
  await record({ action: 'refund.requested', actor: user._id, booking: payment.booking, payment: payment._id, details: { reference } });
  try {
    const refund = await createRefund(reference);
    const state = ['pending', 'processing', 'processed'].includes(refund?.status) ? refund.status : 'requested';
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { refundStatus: state, refundReference: refund?.reference || '' , ...(state === 'processed' ? { status: 'refunded' } : {}) } },
    );
    return { reference, refundStatus: state, refundReference: refund?.reference || '' };
  } catch (error) {
    logger.error('Refund request requires manual reconciliation', { reference, message: error.message });
    await record({ action: 'refund.reconciliation_required', actor: user._id, booking: payment.booking, payment: payment._id, details: { reference } });
    throw new AppError('Refund outcome is uncertain. Check Paystack before retrying.', 502);
  }
}

module.exports = {
  safeCheckoutUrl, initializePayment, reconcileCharge, processWebhook,
  getPaymentStatus, listPayments, requestRefund,
};
