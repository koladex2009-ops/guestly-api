const { z } = require("zod");

const createRoomSchema = z.object({
    body: z.object({
        hotel: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid hotel ID"),

        roomNumber: z.string().trim().min(1, "Room number is required"),

        type: z.enum(["standard", "deluxe", "executive", "suite"]),

        pricePerNight: z.number()
            .int("Price must be an integer in kobo")
            .min(1, "Price must be at least 1 kobo"),

        capacity: z.number()
            .int("Capacity must be a whole number")
            .min(1, "Capacity must be at least 1"),

        amenities: z.array(z.string()).default([]),

        images: z.array(z.string()).default([]),

        isActive: z.boolean().default(true),
    }),
});

module.exports = {
    createRoomSchema,
};