const { Router } = require('express');
const validate = require('../../middleware/validate');
const auth = require('../../middleware/auth');
const { registerSchema, loginSchema, profileSchema } = require('./validation');
const { register, login, getMe, updateMe, logout } = require('./controller');

const router = Router();
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', auth, getMe);
router.patch('/me', auth, validate(profileSchema), updateMe);
router.post('/logout', auth, logout);

module.exports = router;
