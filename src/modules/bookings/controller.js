const { createHold, listBookings, getBooking, cancelHold } = require('./service');

async function create(req, res, next) {
  try {
    const data = await createHold(req.validated.body, req.user);
    return res.status(201).json({ success: true, message: 'Booking hold created', data });
  } catch (error) { return next(error); }
}

async function mine(req, res, next) {
  try {
    const data = await listBookings({ ...req.validated.query, user: req.user, mine: true });
    return res.status(200).json({ success: true, message: 'My bookings retrieved', data });
  } catch (error) { return next(error); }
}

async function all(req, res, next) {
  try {
    const data = await listBookings({ ...req.validated.query, user: req.user });
    return res.status(200).json({ success: true, message: 'Bookings retrieved', data });
  } catch (error) { return next(error); }
}

async function detail(req, res, next) {
  try {
    const data = await getBooking(req.validated.params.id, req.user);
    return res.status(200).json({ success: true, message: 'Booking retrieved', data });
  } catch (error) { return next(error); }
}

async function cancel(req, res, next) {
  try {
    const data = await cancelHold(req.validated.params.id, req.user);
    return res.status(200).json({ success: true, message: 'Booking hold cancelled', data });
  } catch (error) { return next(error); }
}

module.exports = { create, mine, all, detail, cancel };
