const { verifyWebhookSignature } = require('./paystack');
const { initializePayment, processWebhook, getPaymentStatus, listPayments } = require('./service');

const send = (res, message, data) => res.status(200).json({ success: true, message, data });

const initialize = async (req, res, next) => {
  try {
    const data = await initializePayment({ bookingId: req.validated.body.bookingId, user: req.user });
    return send(res, 'Payment initialized', data);
  } catch (error) {
    return next(error);
  }
};

const webhook = async (req, res, next) => {
  try {
    const signature = req.get('x-paystack-signature');
    if (!Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }
    const event = JSON.parse(req.body.toString('utf8'));
    await processWebhook(event);
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error); // a 500 makes Paystack retry later
  }
};

const status = async (req, res, next) => {
  try {
    const data = await getPaymentStatus({ reference: req.validated.params.reference, user: req.user });
    return send(res, 'Payment status retrieved', data);
  } catch (error) {
    return next(error);
  }
};

const listMine = async (req, res, next) => {
  try {
    const { page, limit } = req.validated.query;
    const data = await listPayments({ filter: { guest: req.user._id }, page, limit });
    return send(res, 'Payments retrieved', data);
  } catch (error) {
    return next(error);
  }
};

const listAll = async (req, res, next) => {
  try {
    const { status: paymentStatus, page, limit } = req.validated.query;
    const filter = paymentStatus ? { status: paymentStatus } : {};
    const data = await listPayments({ filter, page, limit });
    return send(res, 'Payments retrieved', data);
  } catch (error) {
    return next(error);
  }
};

module.exports = { initialize, webhook, status, listMine, listAll };