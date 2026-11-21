const { z } = require('zod');

const statuses = ['pending', 'success', 'failed', 'abandoned', 'review_required', 'refund_required', 'refunded'];

const initializePaymentSchema = z.object({
  body: z.strictObject({
    bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'bookingId must be a valid id'),
  }),
});

const listPaymentsSchema = z.object({
  query: z.object({
    status: z.enum(statuses).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  }),
});

const paymentStatusSchema = z.object({
  params: z.object({ reference: z.string().min(5).max(100).regex(/^[a-zA-Z0-9_-]+$/) }),
});

module.exports = { initializePaymentSchema, listPaymentsSchema, paymentStatusSchema };
