const { z } = require('zod');

const ruleSchema = z.object({
  body: z.strictObject({ pointsPerNight: z.number().int().min(0).max(10000) }),
});
const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  }),
});
module.exports = { ruleSchema, listSchema };
