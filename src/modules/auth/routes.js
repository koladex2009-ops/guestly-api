const { Router } = require('express');
const validate = require("../../middleware/validate");
const { registerSchema, loginSchema} =require("./validation");
const { register } = require("./controller")
const router = Router();

router.post("/register", validate(registerSchema), register); // Registration
router.post("/login", validate(loginSchema)); // login


module.exports = router;

