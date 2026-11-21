const { getAccess } = require('./service');

async function get(req, res, next) {
  try {
    const data = await getAccess(req.validated.params.bookingId, req.user);
    res.set('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, message: 'Simulated room access retrieved', data });
  } catch (error) { return next(error); }
}

module.exports = { get };
