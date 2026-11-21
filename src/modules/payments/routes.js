const { Router } = require('express');
const { webhook } = require('./controller');

const router = Router();

// Called by Paystack, not by users, so it has no auth. The signature check protects it.
router.post('/webhook', webhook);

module.exports = router;