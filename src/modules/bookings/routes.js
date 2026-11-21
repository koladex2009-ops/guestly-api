const { Router } = require('express');
const validate = require("../../middleware/validate");
const auth = require("../../middleware/auth");
const authorize = require("../../middleware/role")
const { createBookingSchema } = require("./validation");
const { createBooking, getMyBookings,getAllBookings } = require("./controller");

const router = Router();

router.post("/", auth, validate(createBookingSchema), createBooking);
router.get("/my-bookings", auth, getMyBookings);
router.get("/", auth, authorize("manager"), getAllBookings );

module.exports = router;
