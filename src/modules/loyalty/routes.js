const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { ruleSchema, listSchema } = require('./validation');
const { me, manager, rules, saveRule, reconcile } = require('./controller');

const router = Router();
router.get('/me', auth, authorize('guest'), validate(listSchema), me);
router.get('/manager', auth, authorize('manager'), validate(listSchema), manager);
router.get('/rules', auth, authorize('manager'), rules);
router.post('/rules', auth, authorize('manager'), validate(ruleSchema), saveRule);
router.post('/reconcile', auth, authorize('manager'), reconcile);

module.exports = router;
