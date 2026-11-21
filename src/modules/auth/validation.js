const { z } = require('zod');

const name = z.string().trim().min(2).max(100);
const email = z.string().trim().toLowerCase().email();
const password = z.string().min(8).max(72);

const registerSchema = z.object({
  body: z.object({
    firstName: name,
    lastName: name,
    email,
    password,
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

const loginSchema = z.object({
  body: z.object({ email, password: z.string().min(1) }),
});

const profileSchema = z.object({
  body: z.object({
    firstName: name,
    lastName: name,
    phone: z.string().trim().max(32).optional(),
  }),
});

module.exports = { registerSchema, loginSchema, profileSchema };
