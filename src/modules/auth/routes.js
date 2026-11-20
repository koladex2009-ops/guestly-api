const { Router } = require('express');
const validate = require("../../middleware/validate");
const { registerSchema, loginSchema} =require("./validation");
const auth = require("../../middleware/auth");
const { register, login, getMe } = require("./controller");


const router = Router();

router.post("/register", validate(registerSchema), register); // Registration
router.post("/login", validate(loginSchema), login); // login
router.get("/me", auth, getMe);
// router.get("/", auth, authorize("manager"), getAllBookings );



module.exports = router;

