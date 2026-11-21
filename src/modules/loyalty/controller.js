const service = require('./service');

async function me(req, res, next) {
  try {
    const data = await service.summary(req.user._id, req.validated.query);
    res.set('Cache-Control', 'private, no-store');
    return res.status(200).json({ success: true, message: 'Verified-stay loyalty retrieved', data });
  } catch (error) { return next(error); }
}
async function manager(req, res, next) {
  try {
    const data = await service.manager(req.validated.query);
    res.set('Cache-Control', 'private, no-store');
    return res.status(200).json({ success: true, message: 'Loyalty summary retrieved', data });
  } catch (error) { return next(error); }
}
async function rules(req, res, next) {
  try {
    const data = await service.rules();
    return res.status(200).json({ success: true, message: 'Loyalty rule history retrieved', data });
  } catch (error) { return next(error); }
}
async function saveRule(req, res, next) {
  try {
    const data = await service.createRule(req.validated.body.pointsPerNight, req.user);
    return res.status(201).json({ success: true, message: 'Future eligible stays use the new loyalty rule', data });
  } catch (error) { return next(error); }
}
async function reconcile(req, res, next) {
  try {
    const data = await service.reconcileAll();
    return res.status(200).json({ success: true, message: 'Eligible live stays reconciled', data });
  } catch (error) { return next(error); }
}
module.exports = { me, manager, rules, saveRule, reconcile };
