const crypto = require('node:crypto');
const Booking = require('../bookings/model');
const CheckIn = require('../checkins/model');
const RoomKey = require('./model');
const AppError = require('../../utils/AppError');
const env = require('../../config/env');

function timeWindow(booking, approvalTime) {
  const start = Date.parse(booking.checkIn + 'T14:00:00+01:00');
  const end = Date.parse(booking.checkOut + 'T12:00:00+01:00');
  return { validFrom: new Date(Math.max(start, new Date(approvalTime).getTime())).toISOString(), expiresAt: new Date(end).toISOString() };
}

function simulateCode(nonce, bookingId) {
  return 'SIM-' + crypto.createHmac('sha256', env.JWT_SECRET)
    .update('guestly:simulated-room-access:v1:' + nonce + ':' + bookingId)
    .digest('hex').slice(0, 8).toUpperCase();
}

async function getAccess(bookingId, user, now = new Date()) {
  const booking = await Booking.findById(bookingId);
  if (!booking || String(booking.guest) !== String(user._id)) throw new AppError('Reservation not found', 404);
  const checkin = await CheckIn.findOne({ booking: booking._id, guest: user._id });
  const unavailable = { bookingId, status: 'unavailable', code: null, simulated: true, validFrom: null, expiresAt: null };
  if (booking.status !== 'confirmed' || !checkin || checkin.status !== 'approved') return unavailable;
  const { validFrom, expiresAt } = timeWindow(booking, checkin.reviewedAt);
  const timestamp = now.getTime();
  if (timestamp >= Date.parse(expiresAt)) return { ...unavailable, status: 'expired', validFrom, expiresAt };
  if (timestamp < Date.parse(validFrom)) return { ...unavailable, status: 'scheduled', validFrom, expiresAt };
  const record = await RoomKey.findOne({ booking: booking._id, checkIn: checkin._id, guest: user._id, revokedAt: null }).select('+nonce');
  if (!record) return unavailable;
  return { bookingId, status: 'active', code: simulateCode(record.nonce, bookingId), simulated: true, validFrom, expiresAt };
}

module.exports = { timeWindow, simulateCode, getAccess };
