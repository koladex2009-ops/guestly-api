const Historical = require('../historical/model');
const Booking = require('../bookings/model');
const Payment = require('../payments/model');
const ServiceRequest = require('../servicerequests/model');
const Room = require('../rooms/model');
const LoyaltyAward = require('../loyalty/award-model');

const avg = rows => rows.length ? rows.reduce((total, value) => total + value, 0) / rows.length : 0;
const outcomes = (rows, field, names) => names.map(name => ({ name, count: rows.filter(item => item[field] === name).length }));

async function historicalOverview() {
  const sources = ['bookings', 'guests', 'payments', 'service-requests'];
  const data = {};
  for (const source of sources) {
    const records = await Historical.find({ source }).sort({ sourceRow: 1 }).select('payload').lean();
    data[source] = records.map(item => item.payload);
  }
  const [bookings, guests, payments, requests] = sources.map(source => data[source]);
  const counts = { bookings: bookings.length, guests: guests.length, payments: payments.length, requests: requests.length };
  if (!Object.values(counts).some(Boolean)) {
    return { imported: false, counts, distinctGuestIds: 0, conflictingGuestIds: 0, verifiedGatewayPayments: 0 };
  }
  const profiles = new Map();
  for (const item of guests) {
    const set = profiles.get(item.Guest_ID) || new Set();
    set.add(JSON.stringify(item));
    profiles.set(item.Guest_ID, set);
  }
  const successful = payments.filter(item => item.Payment_Status === 'Successful');
  const months = [...new Set(payments.map(item => item.Booking_Date.slice(0, 7)))].sort().map(month => {
    const rows = successful.filter(item => item.Booking_Date.startsWith(month));
    return { month, revenue: rows.reduce((sum, item) => sum + item.Total_Revenue_NGN, 0), count: rows.length };
  });
  const rooms = [...new Set(bookings.map(item => item.Room_Type))].sort().map(name => {
    const rows = bookings.filter(item => item.Room_Type === name);
    return { name, count: rows.length, averageRate: Math.round(avg(rows.map(item => item.Nightly_Rate_NGN))) };
  });
  const services = [...new Set(requests.map(item => item.Service_Request_Type))].sort().map(name => {
    const rows = requests.filter(item => item.Service_Request_Type === name);
    return {
      name, count: rows.length,
      response: avg(rows.map(item => item.Service_Response_Time_Min)),
      resolution: avg(rows.map(item => item.Service_Resolution_Time_Min)),
      satisfaction: avg(rows.map(item => item.Guest_Satisfaction_1_5)),
    };
  });
  const dates = bookings.map(item => item.Booking_Date).sort();
  return {
    imported: true, source: 'historical-data-analyst', counts,
    distinctGuestIds: profiles.size,
    conflictingGuestIds: [...profiles.values()].filter(values => values.size > 1).length,
    completed: bookings.filter(item => item.Booking_Status === 'Completed').length,
    successfulPayments: successful.length,
    historicalSuccessfulRevenueNGN: successful.reduce((sum, item) => sum + item.Total_Revenue_NGN, 0),
    verifiedGatewayPayments: 0, eligibleLoyaltyAwards: 0,
    returningBookings: bookings.filter(item => item.Returning_Guest === 'Yes').length,
    satisfaction: avg(requests.map(item => item.Guest_Satisfaction_1_5)),
    response: avg(requests.map(item => item.Service_Response_Time_Min)),
    resolution: avg(requests.map(item => item.Service_Resolution_Time_Min)),
    bookingOutcomes: outcomes(bookings, 'Booking_Status', ['Completed', 'Cancelled', 'Abandoned']),
    paymentOutcomes: outcomes(payments, 'Payment_Status', ['Successful', 'Failed', 'Pending', 'Refunded']),
    months, rooms, services, from: dates[0] || '', to: dates[dates.length - 1] || '',
  };
}

async function liveOverview() {
  const [confirmedBookings, allBookings, paymentCount, verifiedPayments, totals, requests, finishedRequests, rooms, awarded] = await Promise.all([
    Booking.countDocuments({ status: 'confirmed' }),
    Booking.countDocuments({}),
    Payment.countDocuments({}),
    Payment.countDocuments({ status: 'success' }),
    Payment.aggregate([{ $match: { status: 'success', currency: 'NGN' } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]),
    ServiceRequest.countDocuments({}),
    ServiceRequest.countDocuments({ status: 'done' }),
    Room.aggregate([{ $group: { _id: null, inventory: { $sum: '$inventory' } } }]),
    LoyaltyAward.aggregate([{ $match: { revokedAt: null } }, { $group: { _id: null, points: { $sum: '$points' } } }]),
  ]);
  const verifiedRevenueKobo = totals[0]?.amount || 0;
  return {
    source: 'live-verified', confirmedBookings, allBookings, paymentCount, verifiedPayments,
    verifiedRevenueKobo, verifiedRevenueNGN: verifiedRevenueKobo / 100,
    serviceRequests: requests, completedServiceRequests: finishedRequests,
    serviceCompletionPercent: requests ? Math.round(finishedRequests / requests * 100) : null,
    roomInventory: rooms[0]?.inventory || 0, loyaltyPointsAwarded: awarded[0]?.points || 0,
  };
}

async function historicalRecords(source, { page = 1, limit = 30, q, status }) {
  const filter = { source };
  const key = { bookings: 'Booking_ID', guests: 'Guest_ID', payments: 'Payment_ID', 'service-requests': 'Request_ID' }[source];
  const statusKey = { bookings: 'Booking_Status', payments: 'Payment_Status' }[source];
  if (q) filter['payload.' + key] = { $regex: q, $options: 'i' };
  if (status && statusKey) filter['payload.' + statusKey] = status;
  const [rows, total] = await Promise.all([
    Historical.find(filter).sort({ sourceRow: 1 }).skip((page - 1) * limit).limit(limit).select('sourceId sourceRow payload'),
    Historical.countDocuments(filter),
  ]);
  return { source, items: rows.map(item => ({ sourceId: item.sourceId, sourceRow: item.sourceRow, ...item.payload })), total, page, limit };
}

module.exports = { historicalOverview, liveOverview, historicalRecords };
