const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { createBookingSchema, listBookingsSchema, bookingIdSchema } = require('./validation');
const { create, mine, all, detail, cancel } = require('./controller');

const router = Router();
router.post('/', auth, authorize('guest'), validate(createBookingSchema), create);
router.get('/me', auth, authorize('guest'), validate(listBookingsSchema), mine);
router.get('/', auth, authorize('staff', 'manager'), validate(listBookingsSchema), all);
router.get('/:id', auth, authorize('guest', 'staff', 'manager'), validate(bookingIdSchema), detail);
router.post('/:id/cancel', auth, authorize('guest'), validate(bookingIdSchema), cancel);

module.exports = router;
