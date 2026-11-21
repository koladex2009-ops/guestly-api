const { verifyWebhookSignature } = require('./paystack');
const { processWebhook } = require('./service');

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

module.exports = { webhook };