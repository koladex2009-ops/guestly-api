const cron = require('node-cron');
const mongoose = require('mongoose');
const Payment = require('../modules/payments/model');
const logger = require('../config/logger');
const { record } = require('../modules/auditlogs/service');

const GRACE_MS = 15 * 60 * 1000; // a payment may still arrive shortly after the hold ends

const expirePendingBookings = async () => {
  const Booking = mongoose.models.Booking;
  if (!Booking) return 0; // Task A's model is not loaded yet
  const cutoff = new Date(Date.now() - GRACE_MS);
  const stale = await Booking.find({ status: 'pending', expiresAt: { $lte: cutoff } }).select('_id').limit(200);

  let expired = 0;
  for (const { _id } of stale) {
    const result = await Booking.updateOne({ _id, status: 'pending' }, { status: 'expired' });
    if (result.modifiedCount === 0) continue; // paid or changed in the meantime
    expired += 1;
    await Payment.updateMany({ booking: _id, status: 'pending' }, { status: 'abandoned' });
    // TODO (agree with Task A): release the RoomNight documents held by this booking
    await record({ action: 'booking.expired', booking: _id });
  }
  if (expired) logger.info('Expired pending bookings', { count: expired });
  return expired;
};

let task = null;
const start = () => {
  if (task) return task;
  task = cron.schedule('*/5 * * * *', () => {
    expirePendingBookings().catch((err) => logger.error('expireBookings failed', { message: err.message }));
  });
  return task;
};

module.exports = { start, expirePendingBookings };