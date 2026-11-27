import { z } from 'zod';

/**
 * Validation rules from Blueprint Section 13.1:
 * - name (user): 2-50 chars, trimmed
 * - email: valid format, lower-cased, unique
 * - password: 8-72 chars, at least 1 letter and 1 number
 */

// POST /api/v1/auth/register (Endpoint #3)
export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, { message: 'Name must be between 2 and 50 characters' })
      .max(50, { message: 'Name must be between 2 and 50 characters' }),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email({ message: 'Invalid email address' })
      .max(254, { message: 'Email cannot exceed 254 characters' })
      .toLowerCase(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, { message: 'Password must be at least 8 characters long' })
      .max(72, { message: 'Password cannot exceed 72 characters' })
      .regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
        message: 'Password must contain at least one letter and one number',
      }),
  }),
});

// POST /api/v1/auth/login (Endpoint #4)
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email({ message: 'Invalid email address' })
      .toLowerCase(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, { message: 'Password is required' }),
  }),
});

// POST /api/v1/auth/refresh (Endpoint #5 - refreshToken in cookie)
export const refreshSchema = z.object({
  cookies: z
    .object({
      refreshToken: z.string({ required_error: 'Refresh token cookie is required' }),
    })
    .passthrough(),
});
