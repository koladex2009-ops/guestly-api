const service = require('./service');

async function mine(req, res, next) {
  try {
    const data = await service.messages(req.user._id, req.validated.query);
    return res.status(200).json({ success: true, message: 'Conversation messages retrieved', data });
  } catch (error) { return next(error); }
}
async function sendMine(req, res, next) {
  try {
    const data = await service.submit(req.user._id, req.validated.body.text, req.user);
    return res.status(201).json({ success: true, message: 'Message sent to concierge', data });
  } catch (error) { return next(error); }
}
async function inbox(req, res, next) {
  try {
    const data = await service.conversations(req.validated.query);
    return res.status(200).json({ success: true, message: 'Concierge conversations retrieved', data });
  } catch (error) { return next(error); }
}
async function guestMessages(req, res, next) {
  try {
    const data = await service.messages(req.validated.params.guestId, req.validated.query);
    return res.status(200).json({ success: true, message: 'Guest conversation retrieved', data });
  } catch (error) { return next(error); }
}
async function reply(req, res, next) {
  try {
    const data = await service.submit(req.validated.params.guestId, req.validated.body.text, req.user);
    return res.status(201).json({ success: true, message: 'Concierge reply sent', data });
  } catch (error) { return next(error); }
}
module.exports = { mine, sendMine, inbox, guestMessages, reply };
