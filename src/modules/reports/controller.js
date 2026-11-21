const service = require('./service');

async function overview(req, res, next) {
  try {
    const [historical, live] = await Promise.all([service.historicalOverview(), service.liveOverview()]);
    res.set('Cache-Control', 'private, no-store');
    return res.status(200).json({ success: true, message: 'Historical and live reports retrieved separately', data: { historical, live } });
  } catch (error) { return next(error); }
}
async function records(req, res, next) {
  try {
    const data = await service.historicalRecords(req.validated.params.source, req.validated.query);
    res.set('Cache-Control', 'private, no-store');
    return res.status(200).json({ success: true, message: 'Historical source records retrieved', data });
  } catch (error) { return next(error); }
}
module.exports = { overview, records };
