const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { initializePaymentSchema, listPaymentsSchema, paymentStatusSchema } = require('./validation');
const { initialize, webhook, status, listMine, listAll } = require('./controller');

const router = Router();

// Called by Paystack, not by users: no auth, protected by the signature check
router.post('/webhook', webhook);

router.post('/initialize', auth, authorize('guest'), validate(initializePaymentSchema), initialize);
router.get('/me', auth, authorize('guest'), validate(listPaymentsSchema), listMine);
router.get('/', auth, authorize('manager'), validate(listPaymentsSchema), listAll);
router.get('/:reference/status', auth, validate(paymentStatusSchema), status);

module.exports = router;