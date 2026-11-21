const { z } = require('zod');

const bookingId = z.string().regex(/^[a-f0-9]{24}$/i);
const documentKinds = ['Passport', 'National ID', "Driver's licence"];

const submitSchema = z.object({
  body: z.object({
    bookingId,
    arrivalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    documentKind: z.enum(documentKinds),
  }).strict(),
});

const reviewSchema = z.object({
  params: z.object({ bookingId }),
  body: z.object({
    approved: z.boolean(),
    note: z.string().trim().max(300).default(''),
  }).strict().refine(value => value.approved || value.note.length > 0, { message: 'A rejection reason is required' }),
});

const listSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  }),
});

const documentSchema = z.object({ params: z.object({ bookingId }) });

module.exports = { submitSchema, reviewSchema, listSchema, documentSchema };
