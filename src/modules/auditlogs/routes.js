const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { listAuditSchema } = require('./validation');
const { list } = require('./controller');

const router = Router();
router.get('/', auth, authorize('manager'), validate(listAuditSchema), list);

module.exports = router;
