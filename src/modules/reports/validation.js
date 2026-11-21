const { z } = require('zod');

const recordsSchema = z.object({
  params: z.object({ source: z.enum(['bookings', 'guests', 'payments', 'service-requests']) }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
    q: z.string().trim().max(40).regex(/^[A-Za-z0-9_-]*$/).optional(),
    status: z.string().trim().max(30).optional(),
  }),
});
module.exports = { recordsSchema };
