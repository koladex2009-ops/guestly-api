const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { updateHotelSchema } = require('./validation');
const { show, update } = require('./controller');

const router = Router();
router.get('/current', show);
router.patch('/current', auth, authorize('manager'), validate(updateHotelSchema), update);

module.exports = router;
