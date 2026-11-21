const mongoose = require('mongoose');
const AppError = require('../../utils/AppError');

function localToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = type => parts.find(item => item.type === type)?.value;
  return [part('year'), part('month'), part('day')].join('-');
}

function validateStay(stay, now = new Date()) {
  const nights = (Date.parse(stay.checkOut) - Date.parse(stay.checkIn)) / 86400000;
  if (stay.checkIn < localToday(now) || !Number.isInteger(nights) || nights < 1 || nights > 365) {
    throw new AppError('Choose future dates for a stay of 1 to 365 nights', 400);
  }
}

function peakOccupied(roomId, stay, bookings = []) {
  const events = [];
  for (const booking of bookings) {
    if (String(booking.room?._id || booking.room) !== String(roomId)) continue;
    if (booking.checkIn >= stay.checkOut || booking.checkOut <= stay.checkIn) continue;
    const quantity = booking.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1) continue;
    events.push({ date: booking.checkIn < stay.checkIn ? stay.checkIn : booking.checkIn, delta: quantity });
    events.push({ date: booking.checkOut > stay.checkOut ? stay.checkOut : booking.checkOut, delta: -quantity });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.delta - b.delta);
  let occupied = 0;
  let peak = 0;
  for (const event of events) {
    occupied += event.delta;
    peak = Math.max(peak, occupied);
  }
  return peak;
}

async function activeReservations(roomIds, checkIn, checkOut, session = null) {
  if (!roomIds.length || !mongoose.models.Booking) return [];
  const Booking = mongoose.models.Booking;
  const query = Booking.find({
    room: { $in: roomIds },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
    $or: [
      { status: 'confirmed' },
      { status: 'pending', expiresAt: { $gt: new Date() } },
    ],
  }).select('room checkIn checkOut quantity guests');
  return (session ? query.session(session) : query).lean();
}

function remainingInventory(room, stay, reservations) {
  return Math.max(0, room.inventory - peakOccupied(room._id, stay, reservations));
}

module.exports = { localToday, validateStay, peakOccupied, activeReservations, remainingInventory };
