const { z } = require("zod");

const createHotelSchema = z.object({
    name: z.string().trim().min(2, "Hotel name is required"),

    description: z.string().optional(),

    address: z.string().trim().min(1, "Address is required"),

    city: z.string().trim().min(1, "City is required"),

    state: z.string().trim().min(1, "State is required"),

    country: z.string().trim().min(1, "Country is required"),

    images: z.array(z.string()).default([]),

    amenities: z.array(z.string()).default([]),

    isActive: z.boolean().default(true),
});

module.exports = {
    createHotelSchema,
};
