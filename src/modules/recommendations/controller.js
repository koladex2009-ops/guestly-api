const { recommend } = require('./service');

async function mine(req, res, next) {
  try {
    const data = await recommend(req.user._id, req.validated.query.limit);
    res.set('Cache-Control', 'private, no-store');
    return res.status(200).json({ success: true, message: 'Suggested rooms; recheck dates before booking', data });
  } catch (error) { return next(error); }
}
module.exports = { mine };
