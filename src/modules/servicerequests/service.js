const Booking = require('../bookings/model');
const Request = require('./model');
const Category = require('./catalogue-model');
const { localToday } = require('../rooms/availability');
const AppError = require('../../utils/AppError');
const { record } = require('../auditlogs/service');
const { ensureDefaults } = require('./catalogue');

function serialize(request) {
  const item = request.toObject ? request.toObject() : request;
  return {
    id: String(item._id), bookingId: String(item.booking), guestId: String(item.guest),
    guestName: item.guestName, roomName: item.roomName,
    category: item.categoryName, categoryId: String(item.category),
    details: item.details, status: item.status,
    createdAt: item.createdAt?.toISOString?.() || new Date(item.createdAt).toISOString(),
    history: (item.history || []).map(entry => ({ status: entry.status, at: new Date(entry.at).toISOString() })),
  };
}

async function submit(input, user) {
  const booking = await Booking.findById(input.bookingId);
  if (!booking || String(booking.guest) !== String(user._id)) throw new AppError('Reservation not found', 404);
  const today = localToday();
  if (booking.status !== 'confirmed' || !(booking.checkIn <= today && today < booking.checkOut)) {
    throw new AppError('Services are available only during your confirmed stay', 409);
  }
  await ensureDefaults();
  const category = await Category.findOne({ _id: input.categoryId, active: true });
  if (!category) throw new AppError('Service is not currently available', 409);
  const now = new Date();
  const request = await Request.create({
    booking: booking._id, guest: user._id,
    guestName: [user.firstName, user.lastName].filter(Boolean).join(' '),
    roomName: booking.roomName,
    category: category._id, categoryName: category.name,
    details: input.details, status: 'received',
    history: [{ status: 'received', at: now, actor: user._id }],
  });
  await record({ action: 'service.request.received', actor: user._id, booking: booking._id, details: { requestId: request._id, category: category.name } });
  return serialize(request);
}

async function list({ user, mine = false, page = 1, limit = 30, status }) {
  const filter = mine ? { guest: user._id } : {};
  if (status) filter.status = status;
  const [items, total] = await Promise.all([
    Request.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Request.countDocuments(filter),
  ]);
  return { items: items.map(serialize), total, page, limit };
}

async function advance(id, nextStatus, user) {
  const from = nextStatus === 'in-progress' ? 'received' : 'in-progress';
  const now = new Date();
  const changed = await Request.findOneAndUpdate(
    { _id: id, status: from },
    { $set: { status: nextStatus }, $push: { history: { status: nextStatus, at: now, actor: user._id } } },
    { new: true, runValidators: true },
  );
  if (!changed) throw new AppError('Service request is no longer at the expected stage', 409);
  await record({ action: 'service.request.' + nextStatus, actor: user._id, booking: changed.booking, details: { requestId: changed._id } });
  return serialize(changed);
}

module.exports = { serialize, submit, list, advance };
