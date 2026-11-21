const Booking = require('../bookings/model');
const Payment = require('../payments/model');
const Room = require('../rooms/model');
const Historical = require('../historical/model');
const { serialize } = require('../rooms/service');

async function recommend(guestId, limit = 3) {
  const [rooms, bookings, popular] = await Promise.all([
    Room.find({ inventory: { $gt: 0 } }),
    Booking.find({ guest: guestId, status: 'confirmed' }).sort({ createdAt: -1 }).limit(30),
    Historical.aggregate([
      { $match: { source: 'bookings', 'payload.Booking_Status': 'Completed' } },
      { $group: { _id: '$payload.Room_Type', count: { $sum: 1 } } },
    ]),
  ]);
  const paymentIds = bookings.filter(item => item.payment).map(item => item.payment);
  const paid = paymentIds.length
    ? await Payment.find({ _id: { $in: paymentIds }, guest: guestId, status: 'success' }).select('booking')
    : [];
  const paidBookingIds = new Set(paid.map(item => String(item.booking)));
  const verifiedHistory = bookings.filter(item => paidBookingIds.has(String(item._id)));
  const categories = new Map();
  for (const booking of verifiedHistory) {
    const room = rooms.find(item => String(item._id) === String(booking.room) || item.slug === booking.roomSlug);
    if (room) categories.set(room.category, (categories.get(room.category) || 0) + 1);
  }
  const popularCounts = new Map(popular.map(item => [item._id, item.count]));
  const maxPopularity = Math.max(1, ...popularCounts.values());
  return rooms.map(room => {
    const personal = categories.get(room.category) || 0;
    const historical = popularCounts.get(room.category) || 0;
    const score = personal * 12 + Math.round(historical / maxPopularity * 3) + (room.featured ? 2 : 0);
    const reason = personal ? 'Similar to your verified reservations' :
      historical ? 'Popular room category in historical hotel records' : room.featured ? 'Featured by the hotel' : 'Explore this room type';
    return {
      room: serialize(room), score, reason,
      source: personal ? 'verified-guest-stays' : historical ? 'historical-aggregate' : 'hotel-catalogue',
      availabilityConfirmed: false,
    };
  }).sort((a, b) => b.score - a.score || a.room.nightlyRate - b.room.nightlyRate)
    .slice(0, limit);
}

module.exports = { recommend };
