const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const {
  catalogueCreateSchema, catalogueUpdateSchema, requestSchema, listSchema, updateSchema,
} = require('./validation');
const {
  catalogueList, catalogueManage, catalogueSave, create, mine, all, update,
} = require('./controller');

const router = Router();
router.get('/catalogue', catalogueList);
router.get('/catalogue/manage', auth, authorize('manager'), catalogueManage);
router.post('/catalogue', auth, authorize('manager'), validate(catalogueCreateSchema), catalogueSave);
router.patch('/catalogue/:id', auth, authorize('manager'), validate(catalogueUpdateSchema), catalogueSave);
router.post('/', auth, authorize('guest'), validate(requestSchema), create);
router.get('/me', auth, authorize('guest'), validate(listSchema), mine);
router.get('/', auth, authorize('staff', 'manager'), validate(listSchema), all);
router.patch('/:id/status', auth, authorize('staff'), validate(updateSchema), update);

module.exports = router;
