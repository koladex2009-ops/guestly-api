const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);
const status = z.enum(['pending', 'confirmed', 'expired', 'cancelled']);

const createBookingSchema = z.object({
  body: z.strictObject({
    roomId: z.string().regex(/^[a-z0-9-]{2,110}$/),
    checkIn: z.iso.date(),
    checkOut: z.iso.date(),
    guests: z.number().int().min(1).max(3),
    requestId: z.uuid(),
  }),
});

const listBookingsSchema = z.object({
  query: z.object({
    status: status.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  }),
});

const bookingIdSchema = z.object({ params: z.object({ id: objectId }) });

module.exports = { createBookingSchema, listBookingsSchema, bookingIdSchema };
