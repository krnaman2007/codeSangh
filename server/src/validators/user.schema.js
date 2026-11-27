import { z } from 'zod';

/**
 * Validation schemas for Users module (Blueprint Section 7.4 & 13.1)
 */

// PATCH /api/v1/users/me (Endpoint #8)
export const updateMeSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, { message: 'Name must be between 2 and 50 characters' })
        .max(50, { message: 'Name must be between 2 and 50 characters' })
        .optional(),
      avatarColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Avatar color must be a valid 6-character hex code (e.g. #6366F1)' })
        .optional(),
      preferences: z
        .object({
          aiSuggestions: z.boolean().optional(),
          suggestionDelayMs: z
            .number()
            .int()
            .min(200, { message: 'suggestionDelayMs must be between 200 and 2000' })
            .max(2000, { message: 'suggestionDelayMs must be between 200 and 2000' })
            .optional(),
        })
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided to update',
    }),
});

// PATCH /api/v1/users/me/password (Endpoint #9)
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string({ required_error: 'Current password is required' }).min(1),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, { message: 'Password must be at least 8 characters long' })
      .max(72, { message: 'Password cannot exceed 72 characters' })
      .regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
        message: 'Password must contain at least one letter and one number',
      }),
  }),
});

// GET /api/v1/users/search?q=riy&projectId=... (Endpoint #10)
export const searchUsersSchema = z.object({
  query: z.object({
    q: z
      .string({ required_error: 'Search query parameter q is required' })
      .trim()
      .min(3, { message: 'Search query must be at least 3 characters long' })
      .max(100),
    projectId: z
      .string({ required_error: 'projectId query parameter is required' })
      .uuid({ message: 'projectId must be a valid UUID' }),
  }),
});
