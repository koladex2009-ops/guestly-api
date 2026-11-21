const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        reference: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        guest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,

        },

        nights: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: "Nights must be a whole number",
            },
        },
        
        guests: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: "Guests must be a whole number",
            },
        },

        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },

        checkIn: {
            type: Date,
            required: true,
        },

        checkOut: {
            type: Date,
            required: true,
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: "Total amount must be an integer in kobo",
            },
        },

        currency: {
            type: String,
            default: "NGN",
        },
        
        
        status: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "cancelled",
                "expired",
                "completed",
            ],
            default: "pending",
        },
        
        expiresAt: {
            type: Date,
        },

        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Booking", bookingSchema);