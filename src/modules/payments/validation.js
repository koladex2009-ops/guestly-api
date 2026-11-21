const { z } = require('zod');

const initializePaymentSchema = z.object({
  body: z.object({
    bookingId: z
      .string({ required_error: 'bookingId is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'bookingId must be a valid id'),
  }),
});

module.exports = { initializePaymentSchema };