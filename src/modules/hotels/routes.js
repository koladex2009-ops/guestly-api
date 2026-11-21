const { Router } = require("express");
const validate = require("../../middleware/validate");
const { createHotelSchema } = require("./validation");
const { createHotel } = require("./controller");

const router = Router();

router.post("/", validate(createHotelSchema), createHotel);

module.exports = router;
