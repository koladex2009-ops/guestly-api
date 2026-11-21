const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { sendSchema, guestSchema, staffSendSchema, listSchema } = require('./validation');
const { mine, sendMine, inbox, guestMessages, reply } = require('./controller');

const router = Router();
router.get('/me', auth, authorize('guest'), validate(listSchema), mine);
router.post('/me', auth, authorize('guest'), validate(sendSchema), sendMine);
router.get('/conversations', auth, authorize('staff'), validate(listSchema), inbox);
router.get('/:guestId', auth, authorize('staff'), validate(guestSchema), guestMessages);
router.post('/:guestId', auth, authorize('staff'), validate(staffSendSchema), reply);

module.exports = router;
