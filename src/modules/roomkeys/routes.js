const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { accessSchema } = require('./validation');
const { get } = require('./controller');

const router = Router();
router.get('/:bookingId', auth, authorize('guest'), validate(accessSchema), get);

module.exports = router;
