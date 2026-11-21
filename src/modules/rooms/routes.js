const { Router } = require('express');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/role');
const validate = require('../../middleware/validate');
const { createRoomSchema, updateRoomSchema, roomSlugSchema, availabilitySchema } = require('./validation');
const { receive } = require('./photos');
const { list, detail, availability, create, update, upload } = require('./controller');

const router = Router();
router.get('/', list);
router.get('/availability', validate(availabilitySchema), availability);
router.get('/:slug', validate(roomSlugSchema), detail);
router.post('/', auth, authorize('manager'), validate(createRoomSchema), create);
router.patch('/:slug', auth, authorize('manager'), validate(updateRoomSchema), update);
router.post('/photos', auth, authorize('manager'), receive, upload);

module.exports = router;
