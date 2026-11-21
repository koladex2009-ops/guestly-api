const { z } = require('zod');

const id = z.string().regex(/^[a-f0-9]{24}$/i);
const categoryFields = {
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().min(2).max(300),
  active: z.boolean(),
};
const catalogueCreateSchema = z.object({ body: z.strictObject(categoryFields) });
const catalogueUpdateSchema = z.object({
  params: z.object({ id }),
  body: z.strictObject(categoryFields).partial().refine(value => Object.keys(value).length > 0, 'Provide a field to update'),
});
const requestSchema = z.object({
  body: z.strictObject({
    bookingId: id,
    categoryId: id,
    details: z.string().trim().max(500).default(''),
  }),
});
const listSchema = z.object({
  query: z.object({
    status: z.enum(['received', 'in-progress', 'done']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  }),
});
const updateSchema = z.object({
  params: z.object({ id }),
  body: z.strictObject({ status: z.enum(['in-progress', 'done']) }),
});
module.exports = { catalogueCreateSchema, catalogueUpdateSchema, requestSchema, listSchema, updateSchema };
