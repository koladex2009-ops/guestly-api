const cron = require('node-cron');
const Booking = require('../modules/bookings/model');
const logger = require('../config/logger');
const { record } = require('../modules/auditlogs/service');

async function expirePendingBookings() {
  const stale = await Booking.find({
    status: 'pending',
    expiresAt: { $lte: new Date() },
  }).select('_id').limit(200);
  let expired = 0;
  for (const { _id } of stale) {
    const result = await Booking.updateOne(
      { _id, status: 'pending', expiresAt: { $lte: new Date() } },
      { $set: { status: 'expired' } },
    );
    if (!result.modifiedCount) continue;
    expired += 1;
    await record({ action: 'booking.expired', booking: _id });
  }
  if (expired) logger.info('Expired pending bookings', { count: expired });
  return expired;
}

let task = null;
function start() {
  if (task) return task;
  task = cron.schedule('*/5 * * * *', () => {
    expirePendingBookings().catch(error => logger.error('expireBookings failed', { message: error.message }));
  });
  return task;
}

module.exports = { start, expirePendingBookings };
