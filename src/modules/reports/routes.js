const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { recordsSchema } = require('./validation');
const { overview, records } = require('./controller');

const router = Router();
router.get('/overview', auth, authorize('manager'), overview);
router.get('/historical/:source', auth, authorize('manager'), validate(recordsSchema), records);

module.exports = router;
