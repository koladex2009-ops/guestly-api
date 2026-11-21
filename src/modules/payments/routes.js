const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { initializePaymentSchema, listPaymentsSchema, paymentStatusSchema } = require('./validation');
const { initialize, webhook, status, listMine, listAll, refund } = require('./controller');

const router = Router();
router.post('/webhook', webhook);
router.post('/initialize', auth, authorize('guest'), validate(initializePaymentSchema), initialize);
router.get('/me', auth, authorize('guest'), validate(listPaymentsSchema), listMine);
router.get('/', auth, authorize('manager'), validate(listPaymentsSchema), listAll);
router.get('/:reference/status', auth, authorize('guest', 'staff', 'manager'), validate(paymentStatusSchema), status);
router.post('/:reference/refund', auth, authorize('manager'), validate(paymentStatusSchema), refund);

module.exports = router;
