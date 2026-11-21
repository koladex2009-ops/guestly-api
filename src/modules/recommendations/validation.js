const { z } = require('zod');

const listSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(6).default(3),
  }),
});
module.exports = { listSchema };
