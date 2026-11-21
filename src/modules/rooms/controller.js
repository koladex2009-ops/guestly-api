const roomService = require("./service");

const createRoom = async (req, res, next) => {
    try {
        const room = await roomService.createRoom(req.validated.body);

        return res.status(201).json({
            success: true,
            message: "Room created successfully",
            data: room,
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    createRoom,
};
