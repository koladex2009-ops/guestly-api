const { z } = require('zod');

const accessSchema = z.object({ params: z.object({ bookingId: z.string().regex(/^[a-f0-9]{24}$/i) }) });

module.exports = { accessSchema };
