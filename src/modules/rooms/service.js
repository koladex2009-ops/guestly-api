const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Room = require('./model');
const AppError = require('../../utils/AppError');
const { activeReservations, remainingInventory, validateStay, localToday, peakOccupied } = require('./availability');

function serialize(room) {
  const value = room?.toObject ? room.toObject() : room;
  return {
    id: value.slug,
    name: value.name,
    category: value.category,
    image: value.image,
    nightlyRate: value.nightlyRate,
    capacity: value.capacity,
    size: value.size,
    bed: value.bed,
    view: value.view,
    amenities: value.amenities || [],
    description: value.description,
    inventory: value.inventory,
    featured: Boolean(value.featured),
  };
}

async function listRooms() {
  const rooms = await Room.find({}).sort({ createdAt: 1, name: 1 });
  return rooms.map(serialize);
}

async function showRoom(slug) {
  const room = await Room.findOne({ slug });
  if (!room) throw new AppError('Room type not found', 404);
  return serialize(room);
}

async function checkAvailability(stay) {
  validateStay(stay);
  const rooms = await Room.find({ capacity: { $gte: stay.guests }, inventory: { $gt: 0 } }).sort({ createdAt: 1, name: 1 });
  const bookings = await activeReservations(rooms.map(room => room._id), stay.checkIn, stay.checkOut);
  return rooms.map(room => ({ ...serialize(room), availableInventory: remainingInventory(room, stay, bookings) }))
    .filter(room => room.availableInventory > 0);
}

function slugFromName(name) {
  const safe = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  return safe || 'room';
}

async function createRoom(data) {
  const slug = slugFromName(data.name) + '-' + crypto.randomBytes(3).toString('hex');
  const room = await Room.create({ ...data, slug });
  return serialize(room);
}

async function updateRoom(slug, changes) {
  const room = await Room.findOne({ slug });
  if (!room) throw new AppError('Room type not found', 404);
  const decreasing = (changes.inventory ?? room.inventory) < room.inventory ||
    (changes.capacity ?? room.capacity) < room.capacity;
  if (!decreasing) {
    Object.assign(room, changes);
    await room.save();
    return serialize(room);
  }
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const current = await Room.findOneAndUpdate(
        { slug },
        { $inc: { bookingsRevision: 1 } },
        { new: true, session },
      );
      if (!current) throw new AppError('Room type not found', 404);
      const inventory = changes.inventory ?? current.inventory;
      const capacity = changes.capacity ?? current.capacity;
      const from = localToday();
      const to = '9999-12-31';
      const bookings = await activeReservations([current._id], from, to, session);
      const peak = peakOccupied(current._id, { checkIn: from, checkOut: to }, bookings);
      if (inventory < peak) {
        throw new AppError('Inventory cannot be below existing confirmed reservations or active holds', 409);
      }
      if (bookings.some(booking => (booking.guests || 1) > capacity)) {
        throw new AppError('Capacity cannot be below an existing reservation', 409);
      }
      Object.assign(current, changes);
      await current.save({ session });
      updated = current;
    });
  } finally {
    await session.endSession();
  }
  return serialize(updated);
}

module.exports = { serialize, listRooms, showRoom, checkAvailability, createRoom, updateRoom };
