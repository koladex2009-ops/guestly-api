const mongoose = require("mongoose");
const authorize = require("../../middleware/role");

const roomNightSchema = new mongoose.Schema(
    {
        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },

        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
        },

        date: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

roomNightSchema.index(
    { room: 1, date: 1 },
    { unique: true }
);

module.exports = mongoose.model("RoomNight", roomNightSchema);
