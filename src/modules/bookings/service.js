const mongoose = require('mongoose');
const Booking = require('./model');
const Room = require('../rooms/model');
const AppError = require('../../utils/AppError');
const { validateStay, activeReservations, remainingInventory } = require('../rooms/availability');
const { record } = require('../auditlogs/service');

const HOLD_MINUTES = 15;
const validStatuses = ['pending', 'confirmed', 'expired', 'cancelled'];

function serializeBooking(booking) {
  const value = booking.toObject ? booking.toObject() : booking;
  const nights = (Date.parse(value.checkOut) - Date.parse(value.checkIn)) / 86400000;
  return {
    id: String(value._id),
    guestId: String(value.guest),
    guestName: value.guestName,
    roomId: value.roomSlug,
    roomName: value.roomName,
    checkIn: value.checkIn,
    checkOut: value.checkOut,
    guests: value.guests,
    quantity: value.quantity,
    nightlyRate: value.nightlyRate,
    amount: value.totalAmount / 100,
    currency: 'NGN',
    status: value.status === 'pending' && new Date(value.expiresAt) <= new Date() ? 'expired' : value.status,
    paymentReference: value.latestPaymentReference || '',
    expiresAt: new Date(value.expiresAt).toISOString(),
    createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : new Date().toISOString(),
  };
}

async function createHold(input, user) {
  validateStay(input);
  const earlier = await Booking.findOne({ guest: user._id, requestId: input.requestId });
  if (earlier) return serializeBooking(earlier);
  const nights = (Date.parse(input.checkOut) - Date.parse(input.checkIn)) / 86400000;
  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60000);
  const session = await mongoose.startSession();
  let booking;
  try {
    await session.withTransaction(async () => {
      const existing = await Booking.findOne({ guest: user._id, requestId: input.requestId }).session(session);
      if (existing) {
        booking = existing;
        return;
      }
      const room = await Room.findOneAndUpdate(
        { slug: input.roomId, inventory: { $gt: 0 }, capacity: { $gte: input.guests } },
        { $inc: { bookingsRevision: 1 } },
        { new: true, session },
      );
      if (!room) throw new AppError('Room is not available for this guest count', 409);
      const reservations = await activeReservations([room._id], input.checkIn, input.checkOut, session);
      if (remainingInventory(room, input, reservations) < 1) {
        throw new AppError('This room is no longer available for the selected dates', 409);
      }
      const totalAmount = room.nightlyRate * nights * 100;
      if (!Number.isSafeInteger(totalAmount) || totalAmount < 100) throw new AppError('Room price is invalid', 500);
      const created = await Booking.create([{
        guest: user._id,
        room: room._id,
        requestId: input.requestId,
        roomSlug: room.slug,
        roomName: room.name,
        guestName: [user.firstName, user.lastName].filter(Boolean).join(' '),
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guests: input.guests,
        quantity: 1,
        nightlyRate: room.nightlyRate,
        totalAmount,
        expiresAt,
      }], { session });
      booking = created[0];
    });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Booking.findOne({ guest: user._id, requestId: input.requestId });
      if (existing) return serializeBooking(existing);
    }
    throw error;
  } finally {
    await session.endSession();
  }
  if (!booking) throw new AppError('Unable to create booking hold', 500);
  await record({ action: 'booking.held', actor: user._id, booking: booking._id, details: { expiresAt } });
  return serializeBooking(booking);
}

async function listBookings({ user, status, page = 1, limit = 30, mine = false }) {
  const filter = mine ? { guest: user._id } : {};
  if (status) filter.status = status;
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const [items, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit),
    Booking.countDocuments(filter),
  ]);
  return { items: items.map(serializeBooking), total, page: safePage, limit: safeLimit };
}

async function getBooking(id, user) {
  const booking = await Booking.findById(id);
  if (!booking) throw new AppError('Booking not found', 404);
  if (user.role === 'guest' && String(booking.guest) !== String(user._id)) {
    throw new AppError('Booking not found', 404);
  }
  if (!['guest', 'staff', 'manager'].includes(user.role)) throw new AppError('Access denied', 403);
  return serializeBooking(booking);
}

async function cancelHold(id, user) {
  const booking = await Booking.findOneAndUpdate(
    { _id: id, guest: user._id, status: 'pending' },
    { $set: { status: 'cancelled' } },
    { new: true },
  );
  if (!booking) throw new AppError('Only your pending booking holds can be cancelled', 409);
  await record({ action: 'booking.cancelled', actor: user._id, booking: booking._id });
  return serializeBooking(booking);
}

module.exports = { HOLD_MINUTES, validStatuses, serializeBooking, createHold, listBookings, getBooking, cancelHold };
