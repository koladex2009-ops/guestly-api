const catalogue = require('./catalogue');
const services = require('./service');

async function catalogueList(req, res, next) {
  try {
    const data = await catalogue.list(false);
    return res.status(200).json({ success: true, message: 'Available services retrieved', data });
  } catch (error) { return next(error); }
}
async function catalogueManage(req, res, next) {
  try {
    const data = await catalogue.list(true);
    return res.status(200).json({ success: true, message: 'Service catalogue retrieved', data });
  } catch (error) { return next(error); }
}
async function catalogueSave(req, res, next) {
  try {
    const data = await catalogue.save(req.validated.body, req.validated.params?.id, req.user);
    return res.status(req.validated.params?.id ? 200 : 201).json({ success: true, message: 'Service category saved', data });
  } catch (error) { return next(error); }
}
async function create(req, res, next) {
  try {
    const data = await services.submit(req.validated.body, req.user);
    return res.status(201).json({ success: true, message: 'Service request received', data });
  } catch (error) { return next(error); }
}
async function mine(req, res, next) {
  try {
    const data = await services.list({ ...req.validated.query, mine: true, user: req.user });
    return res.status(200).json({ success: true, message: 'My service requests retrieved', data });
  } catch (error) { return next(error); }
}
async function all(req, res, next) {
  try {
    const data = await services.list({ ...req.validated.query, user: req.user });
    return res.status(200).json({ success: true, message: 'Service requests retrieved', data });
  } catch (error) { return next(error); }
}
async function update(req, res, next) {
  try {
    const data = await services.advance(req.validated.params.id, req.validated.body.status, req.user);
    return res.status(200).json({ success: true, message: 'Service request status updated', data });
  } catch (error) { return next(error); }
}
module.exports = { catalogueList, catalogueManage, catalogueSave, create, mine, all, update };
