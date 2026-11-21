const { z } = require('zod');

const listAuditSchema = z.object({
  query: z.object({
    bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  }),
});

module.exports = { listAuditSchema };
