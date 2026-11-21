const { verifyWebhookSignature } = require('./paystack');
const { initializePayment, processWebhook } = require('./service');

const webhook = async (req, res, next) => {
  try {
    const signature = req.get('x-paystack-signature');
    // req.body is a raw Buffer on this route (set up in app.js)
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

const initialize = async (req, res, next) => {
  try {
    // req.user comes from the auth middleware, bookingId from the validated body
    const data = await initializePayment({
      bookingId: req.validated.body.bookingId,
      user: req.user,
    });
    return res.status(200).json({
      success: true,
      message: 'Payment initialized',
      data,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { initialize, webhook };