const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        hotel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },

        roomNumber: {
            type: String,
            required: true,
            trim: true,
        },

        type: {
            type: String,
            enum: ["standard", "deluxe", "executive", "suite"],
            required: true,
        },

        pricePerNight: {
            type: Number,
            required: true,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message: "Price per night must be an integer in kobo",
            },
        },

        capacity: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: "Capacity must be a whole number",
            },
        },

        amenities: {
            type: [String],
            default: [],
        },

        images: {
            type: [String],
            default: [],
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Room", roomSchema);
