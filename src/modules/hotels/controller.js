const { getCurrentHotel, updateCurrentHotel } = require('./service');

async function show(req, res, next) {
  try {
    const data = await getCurrentHotel();
    return res.status(200).json({ success: true, message: 'Hotel retrieved', data });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const data = await updateCurrentHotel(req.validated.body);
    return res.status(200).json({ success: true, message: 'Hotel updated', data });
  } catch (error) {
    return next(error);
  }
}

module.exports = { show, update };
