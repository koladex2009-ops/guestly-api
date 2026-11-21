const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),

    lastName: z.string().min(2, "Last name must be at least 2 characters"),

    email: z.string().email("Please provide a valid email"),

    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password cannot exceed 72 characters"),

    confirmPassword: z.string()
      .min(8, "Please confirm your password"),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Please provide a valid email"),

    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
};