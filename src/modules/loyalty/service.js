const crypto = require('node:crypto');
const Rule = require('./rule-model');
const Award = require('./award-model');
const Booking = require('../bookings/model');
const Payment = require('../payments/model');
const CheckIn = require('../checkins/model');
const { localToday } = require('../rooms/availability');
const { record } = require('../auditlogs/service');

function endOfStay(booking) {
  return new Date(booking.checkOut + 'T12:00:00+01:00');
}

function nightsOf(booking) {
  return (Date.parse(booking.checkOut + 'T00:00:00Z') - Date.parse(booking.checkIn + 'T00:00:00Z')) / 86400000;
}

async function ensureDefault() {
  await Rule.updateOne(
    { key: 'default' },
    { $setOnInsert: { key: 'default', pointsPerNight: 10, effectiveAt: new Date('1970-01-01T00:00:00.000Z') } },
    { upsert: true },
  );
}

function serializeRule(rule) {
  return { pointsPerNight: rule.pointsPerNight, effectiveAt: new Date(rule.effectiveAt).toISOString() };
}

function serializeAward(award) {
  return {
    id: String(award._id), bookingId: String(award.booking), guestId: String(award.guest),
    roomName: award.roomName, checkoutDate: award.checkoutDate, nights: award.nights,
    points: award.points, pointsPerNight: award.pointsPerNight,
    awardedAt: new Date(award.awardedAt).toISOString(),
    revokedAt: award.revokedAt ? new Date(award.revokedAt).toISOString() : null,
  };
}

async function rules() {
  await ensureDefault();
  const items = await Rule.find({}).sort({ effectiveAt: 1 });
  return items.map(serializeRule);
}

async function createRule(pointsPerNight, user) {
  await ensureDefault();
  const now = new Date();
  const created = await Rule.create({
    key: 'rule-' + crypto.randomUUID(), pointsPerNight, effectiveAt: now, changedBy: user._id,
  });
  await record({ action: 'loyalty.rule.updated', actor: user._id, details: { pointsPerNight, effectiveAt: now.toISOString() } });
  return serializeRule(created);
}

async function eligiblePayment(booking) {
  if (!booking.payment) return false;
  const paid = await Payment.findOne({
    _id: booking.payment, booking: booking._id, guest: booking.guest,
    status: 'success', currency: 'NGN', amount: booking.totalAmount,
  });
  return Boolean(paid);
}

async function reconcileGuest(guestId, now = new Date()) {
  await ensureDefault();
  const [bookings, awards] = await Promise.all([
    Booking.find({ guest: guestId, status: 'confirmed', checkOut: { $lte: localToday(now) } }),
    Award.find({ guest: guestId }),
  ]);
  const byBooking = new Map(awards.map(award => [String(award.booking), award]));
  const eligibleIds = new Set();
  let created = 0;
  let revoked = 0;
  for (const booking of bookings) {
    const checkout = endOfStay(booking);
    const nights = nightsOf(booking);
    if (checkout > now || !(nights >= 1 && nights <= 365)) continue;
    const [checkin, paid] = await Promise.all([
      CheckIn.findOne({ booking: booking._id, guest: guestId, status: 'approved' }),
      eligiblePayment(booking),
    ]);
    if (!checkin || !paid) continue;
    eligibleIds.add(String(booking._id));
    if (byBooking.has(String(booking._id))) continue;
    const rule = await Rule.findOne({ effectiveAt: { $lte: checkout } }).sort({ effectiveAt: -1 });
    if (!rule) continue;
    const result = await Award.updateOne(
      { booking: booking._id },
      { $setOnInsert: {
        booking: booking._id, guest: guestId, roomName: booking.roomName, checkoutDate: booking.checkOut,
        nights, pointsPerNight: rule.pointsPerNight, points: nights * rule.pointsPerNight,
        paidPayment: booking.payment, awardedAt: now, revokedAt: null,
      } },
      { upsert: true },
    );
    if (result.upsertedCount) {
      created++;
      await record({ action: 'loyalty.points.awarded', actor: guestId, booking: booking._id, payment: booking.payment, details: { points: nights * rule.pointsPerNight } });
    }
  }
  for (const award of awards) {
    if (award.revokedAt || eligibleIds.has(String(award.booking))) continue;
    const result = await Award.updateOne(
      { _id: award._id, revokedAt: null },
      { $set: { revokedAt: now } },
    );
    if (result.modifiedCount) {
      revoked++;
      await record({ action: 'loyalty.points.revoked', actor: guestId, booking: award.booking, payment: award.paidPayment, details: { points: award.points } });
    }
  }
  return { created, revoked };
}

async function summary(guestId, { page = 1, limit = 30 } = {}) {
  await reconcileGuest(guestId);
  const [items, total, points, latest] = await Promise.all([
    Award.find({ guest: guestId }).sort({ awardedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Award.countDocuments({ guest: guestId }),
    Award.aggregate([{ $match: { guest: guestId, revokedAt: null } }, { $group: { _id: null, total: { $sum: '$points' } } }]),
    Rule.findOne({}).sort({ effectiveAt: -1 }),
  ]);
  return {
    source: 'live-verified-stays', points: points[0]?.total || 0,
    total, page, limit, rules: latest ? [serializeRule(latest)] : [],
    awards: items.map(serializeAward),
  };
}

async function manager({ page = 1, limit = 30 }) {
  await ensureDefault();
  const [items, total, points, latest] = await Promise.all([
    Award.find({}).sort({ awardedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Award.countDocuments({}),
    Award.aggregate([{ $match: { revokedAt: null } }, { $group: { _id: null, total: { $sum: '$points' } } }]),
    Rule.findOne({}).sort({ effectiveAt: -1 }),
  ]);
  return {
    source: 'live-verified-stays', points: points[0]?.total || 0,
    total, page, limit, rules: latest ? [serializeRule(latest)] : [],
    awards: items.map(serializeAward),
  };
}

async function reconcileAll() {
  const guests = await Booking.distinct('guest', { status: 'confirmed', checkOut: { $lte: localToday() } });
  let created = 0;
  let revoked = 0;
  for (const guest of guests) {
    const result = await reconcileGuest(guest);
    created += result.created;
    revoked += result.revoked;
  }
  return { created, revoked, guestsChecked: guests.length };
}

module.exports = {
  ensureDefault, rules, createRule, reconcileGuest, reconcileAll,
  summary, manager, endOfStay, nightsOf,
};
