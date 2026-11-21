const { z } = require('zod');

const statuses = ['pending', 'success', 'failed', 'abandoned', 'refunded'];

const initializePaymentSchema = z.object({
  body: z.object({
    bookingId: z.string('bookingId is required').regex(/^[0-9a-fA-F]{24}$/, 'bookingId must be a valid id'),
  }),
});

const listPaymentsSchema = z.object({
  query: z.object({
    status: z.enum(statuses).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

const paymentStatusSchema = z.object({
  params: z.object({ reference: z.string().min(5).max(100) }),
});

module.exports = { initializePaymentSchema, listPaymentsSchema, paymentStatusSchema };