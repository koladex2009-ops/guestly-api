const { z } = require('zod');

const guestId = z.string().regex(/^[a-f0-9]{24}$/i);
const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const sendSchema = z.object({ body: z.strictObject({ text: z.string().trim().min(1).max(1000) }) });
const guestSchema = z.object({ params: z.object({ guestId }), query: pagination });
const staffSendSchema = z.object({
  params: z.object({ guestId }),
  body: z.strictObject({ text: z.string().trim().min(1).max(1000) }),
});
const listSchema = z.object({ query: pagination });

module.exports = { sendSchema, guestSchema, staffSendSchema, listSchema };
