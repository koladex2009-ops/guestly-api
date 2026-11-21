const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { initializePaymentSchema } = require('./validation');
const { initialize, webhook } = require('./controller');

const router = Router();

// Called by Paystack, not by users, so it has no auth. The signature check protects it.
router.post('/webhook', webhook);

// A logged-in guest starts a payment for their own pending booking.
router.post(
  '/initialize',
  auth,
  authorize('guest'),
  validate(initializePaymentSchema),
  initialize
);

module.exports = router;