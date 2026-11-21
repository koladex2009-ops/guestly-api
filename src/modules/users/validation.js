const { z } = require('zod');

const name = z.string().trim().min(2).max(100);
const email = z.string().trim().toLowerCase().email();
const role = z.enum(['staff', 'manager']);
const password = z.string().min(8).max(72);

const createTeamSchema = z.object({
  body: z.object({
    firstName: name,
    lastName: name,
    email,
    password,
    confirmPassword: z.string(),
    role,
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

const accessSchema = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/) }),
  body: z.object({ role, isActive: z.boolean() }),
});

module.exports = { createTeamSchema, accessSchema };
