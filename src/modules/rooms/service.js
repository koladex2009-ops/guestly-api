const Room = require("./model");

const createRoom = async (roomData) => {
    const existingRoom = await Room.findOne({
        hotel: roomData.hotel,
        roomNumber: roomData.roomNumber,
    });

    if (existingRoom) {
        const error = new Error(
            "This room number already exists in this hotel"
        );
        error.statusCode = 409;
        throw error;
    }

    const room = await Room.create(roomData);

    return room;
};

module.exports = {
    createRoom,
};
