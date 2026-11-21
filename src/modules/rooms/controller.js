const { listRooms, showRoom, checkAvailability, createRoom, updateRoom } = require('./service');
const { storeImage } = require('./photos');

function respond(res, message, data, status = 200) {
  return res.status(status).json({ success: true, message, data });
}

async function list(req, res, next) {
  try { return respond(res, 'Rooms retrieved', await listRooms()); }
  catch (error) { return next(error); }
}

async function detail(req, res, next) {
  try { return respond(res, 'Room retrieved', await showRoom(req.validated.params.slug)); }
  catch (error) { return next(error); }
}

async function availability(req, res, next) {
  try { return respond(res, 'Availability retrieved', await checkAvailability(req.validated.query)); }
  catch (error) { return next(error); }
}

async function create(req, res, next) {
  try { return respond(res, 'Room created', await createRoom(req.validated.body), 201); }
  catch (error) { return next(error); }
}

async function update(req, res, next) {
  try { return respond(res, 'Room updated', await updateRoom(req.validated.params.slug, req.validated.body)); }
  catch (error) { return next(error); }
}

async function upload(req, res, next) {
  try { return respond(res, 'Photo uploaded', await storeImage(req.file), 201); }
  catch (error) { return next(error); }
}

module.exports = { list, detail, availability, create, update, upload };
