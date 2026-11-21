const { z } = require("zod");

const createBookingSchema = z.object({
    room: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid room ID"),

    checkIn: z.coerce.date(),

    checkOut: z.coerce.date(),

    guests: z.coerce.number()
    .int("Number of guests must be a whole number")
    .min(1, "At least one guest is required"),
});

module.exports = {
    createBookingSchema,
};