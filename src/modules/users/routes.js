const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { createTeamSchema, accessSchema } = require('./validation');
const { list, create, updateAccess } = require('./controller');

const router = Router();
router.use(auth, authorize('admin'));
router.get('/team', list);
router.post('/team', validate(createTeamSchema), create);
router.patch('/team/:id/access', validate(accessSchema), updateAccess);

module.exports = router;
