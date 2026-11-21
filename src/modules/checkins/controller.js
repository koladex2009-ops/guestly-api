const { submit, list, review, retrieveDocument } = require('./service');

async function create(req, res, next) {
  try {
    const data = await submit(req.validated.body, req.file, req.user);
    return res.status(201).json({ success: true, message: 'Check-in submitted for review', data });
  } catch (error) { return next(error); }
}

async function mine(req, res, next) {
  try {
    const data = await list({ ...req.validated.query, user: req.user, mine: true });
    return res.status(200).json({ success: true, message: 'My check-ins retrieved', data });
  } catch (error) { return next(error); }
}

async function queue(req, res, next) {
  try {
    const data = await list({ ...req.validated.query, user: req.user });
    return res.status(200).json({ success: true, message: 'Check-in queue retrieved', data });
  } catch (error) { return next(error); }
}

async function decide(req, res, next) {
  try {
    const data = await review(req.validated.params.bookingId, req.validated.body.approved, req.validated.body.note, req.user);
    return res.status(200).json({ success: true, message: 'Check-in reviewed', data });
  } catch (error) { return next(error); }
}

async function document(req, res, next) {
  try {
    const { buffer, mime } = await retrieveDocument(req.validated.params.bookingId);
    const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
    res.set({
      'Content-Type': mime,
      'Content-Length': String(buffer.length),
      'Content-Disposition': 'attachment; filename="identity-document.' + extension + '"',
      'Cache-Control': 'private, no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    return res.status(200).end(buffer);
  } catch (error) { return next(error); }
}

module.exports = { create, mine, queue, decide, document };
