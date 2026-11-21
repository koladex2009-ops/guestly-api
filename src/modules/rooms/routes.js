const { Router } = require("express");
const validate = require("../../middleware/validate");
const { createRoomSchema } = require("./validation");
const { createRoom } = require("./controller");

const router = Router();

router.post("/", validate(createRoomSchema), createRoom);



module.exports = router;
