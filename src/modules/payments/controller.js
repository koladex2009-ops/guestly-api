const { verifyWebhookSignature } = require('./paystack');
const { initializePayment, processWebhook, getPaymentStatus, listPayments, requestRefund } = require('./service');

const send = (res, message, data) => res.status(200).json({ success: true, message, data });

async function initialize(req, res, next) {
  try {
    return send(res, 'Payment initialized', await initializePayment({ bookingId: req.validated.body.bookingId, user: req.user }));
  } catch (error) { return next(error); }
}

async function webhook(req, res, next) {
  try {
    if (!Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, req.get('x-paystack-signature'))) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }
    const event = JSON.parse(req.body.toString('utf8'));
    await processWebhook(event);
    return res.status(200).json({ success: true });
  } catch (error) { return next(error); }
}

async function status(req, res, next) {
  try {
    return send(res, 'Payment status retrieved', await getPaymentStatus({ reference: req.validated.params.reference, user: req.user }));
  } catch (error) { return next(error); }
}

async function listMine(req, res, next) {
  try {
    return send(res, 'Payments retrieved', await listPayments({ filter: { guest: req.user._id }, ...req.validated.query }));
  } catch (error) { return next(error); }
}

async function listAll(req, res, next) {
  try {
    const { status: paymentStatus, ...pagination } = req.validated.query;
    const filter = paymentStatus ? { status: paymentStatus } : {};
    return send(res, 'Payments retrieved', await listPayments({ filter, ...pagination }));
  } catch (error) { return next(error); }
}

async function refund(req, res, next) {
  try {
    return send(res, 'Refund submitted', await requestRefund({ reference: req.validated.params.reference, user: req.user }));
  } catch (error) { return next(error); }
}

module.exports = { initialize, webhook, status, listMine, listAll, refund };
