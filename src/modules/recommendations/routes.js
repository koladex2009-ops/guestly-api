const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { listSchema } = require('./validation');
const { mine } = require('./controller');

const router = Router();
router.get('/me', auth, authorize('guest'), validate(listSchema), mine);

module.exports = router;
