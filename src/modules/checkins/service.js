const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Booking = require('../bookings/model');
const CheckIn = require('./model');
const RoomKey = require('../roomkeys/model');
const { localToday } = require('../rooms/availability');
const { encryptDocument, decryptDocument } = require('./documents');
const AppError = require('../../utils/AppError');
const { record } = require('../auditlogs/service');

function serialize(item) {
  const value = item.toObject ? item.toObject() : item;
  return {
    id: String(value._id),
    bookingId: String(value.booking),
    guestId: String(value.guest),
    guestName: value.guestName,
    roomName: value.roomName,
    checkIn: value.checkIn,
    checkOut: value.checkOut,
    arrivalTime: value.arrivalTime,
    documentKind: value.documentKind,
    documentAvailable: !value.documentDeletedAt,
    status: value.status,
    submittedAt: new Date(value.submittedAt).toISOString(),
    reviewedAt: value.reviewedAt ? new Date(value.reviewedAt).toISOString() : null,
    reviewNote: value.reviewNote || '',
    history: (value.history || []).map(entry => ({ status: entry.status, at: new Date(entry.at).toISOString() })),
  };
}

function documentDeadline(checkOut) {
  return new Date(Date.parse(checkOut + 'T12:00:00+01:00') + 30 * 86400000);
}

async function submit(input, file, user) {
  const booking = await Booking.findById(input.bookingId);
  if (!booking || String(booking.guest) !== String(user._id)) throw new AppError('Confirmed reservation not found', 404);
  if (booking.status !== 'confirmed' || booking.checkOut <= localToday()) {
    throw new AppError('Only confirmed, unfinished stays are eligible for check-in', 409);
  }
  const encryption = encryptDocument(file);
  const now = new Date();
  const base = {
    arrivalTime: input.arrivalTime,
    documentKind: input.documentKind,
    ...encryption,
    status: 'pending',
    submittedAt: now,
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: '',
    documentDeleteAt: documentDeadline(booking.checkOut),
    documentDeletedAt: null,
  };
  const existing = await CheckIn.findOne({ booking: booking._id });
  if (existing) {
    if (existing.status !== 'rejected') throw new AppError('Check-in already submitted', 409);
    const updated = await CheckIn.findOneAndUpdate(
      { booking: booking._id, guest: user._id, status: 'rejected' },
      { $set: base, $push: { history: { status: 'pending', at: now, actor: user._id } } },
      { new: true, runValidators: true },
    );
    if (!updated) throw new AppError('Check-in has already been resubmitted', 409);
    await record({ action: 'checkin.resubmitted', actor: user._id, booking: booking._id });
    return serialize(updated);
  }
  let submitted;
  try {
    submitted = await CheckIn.create({
      booking: booking._id,
      guest: user._id,
      guestName: [user.firstName, user.lastName].filter(Boolean).join(' '),
      roomName: booking.roomName,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      ...base,
      history: [{ status: 'pending', at: now, actor: user._id }],
    });
  } catch (error) {
    if (error.code === 11000) throw new AppError('Check-in already submitted', 409);
    throw error;
  }
  await record({ action: 'checkin.submitted', actor: user._id, booking: booking._id });
  return serialize(submitted);
}

async function list({ user, mine = false, status, page = 1, limit = 30 }) {
  const filter = mine ? { guest: user._id } : {};
  if (status) filter.status = status;
  const [items, total] = await Promise.all([
    CheckIn.find(filter).sort({ submittedAt: -1 }).skip((page - 1) * limit).limit(limit),
    CheckIn.countDocuments(filter),
  ]);
  return { items: items.map(serialize), total, page, limit };
}

async function review(bookingId, approved, note, user) {
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.status !== 'confirmed' || booking.checkOut <= localToday()) {
    throw new AppError('A valid confirmed reservation is required', 409);
  }
  const status = approved ? 'approved' : 'rejected';
  const now = new Date();
  const changes = {
    $set: { status, reviewedAt: now, reviewedBy: user._id, reviewNote: note },
    $push: { history: { status, at: now, actor: user._id } },
  };
  let updated;
  if (approved) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        updated = await CheckIn.findOneAndUpdate(
          { booking: booking._id, status: 'pending' },
          changes,
          { new: true, runValidators: true, session },
        );
        if (!updated) throw new AppError('This check-in is no longer pending', 409);
        await RoomKey.create([{
          booking: booking._id,
          guest: booking.guest,
          checkIn: updated._id,
          nonce: crypto.randomBytes(24).toString('hex'),
          issuedAt: now,
        }], { session });
      });
    } finally {
      await session.endSession();
    }
  } else {
    updated = await CheckIn.findOneAndUpdate(
      { booking: booking._id, status: 'pending' },
      changes,
      { new: true, runValidators: true },
    );
    if (!updated) throw new AppError('This check-in is no longer pending', 409);
  }
  await record({ action: 'checkin.' + status, actor: user._id, booking: booking._id, details: { note: note || '' } });
  return serialize(updated);
}

async function retrieveDocument(bookingId) {
  const entry = await CheckIn.findOne({ booking: bookingId })
    .select('+documentMime +documentEncrypted +documentIv +documentTag');
  if (!entry || !entry.documentEncrypted || entry.documentDeletedAt) {
    throw new AppError('Identity document is not available', 404);
  }
  const buffer = decryptDocument(entry);
  return { buffer, mime: entry.documentMime };
}

module.exports = { serialize, documentDeadline, submit, list, review, retrieveDocument };
