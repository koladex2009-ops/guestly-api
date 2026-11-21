const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { receive } = require('./documents');
const { submitSchema, reviewSchema, listSchema, documentSchema } = require('./validation');
const { create, mine, queue, decide, document } = require('./controller');

const router = Router();
router.post('/', auth, authorize('guest'), receive, validate(submitSchema), create);
router.get('/me', auth, authorize('guest'), validate(listSchema), mine);
router.get('/', auth, authorize('staff'), validate(listSchema), queue);
router.get('/:bookingId/document', auth, authorize('staff'), validate(documentSchema), document);
router.patch('/:bookingId/review', auth, authorize('staff'), validate(reviewSchema), decide);

module.exports = router;
