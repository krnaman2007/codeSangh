import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';
import { validateNodeName } from '../utils/nameRules.js';

/**
 * Validation schemas for File/Folder Nodes (Blueprint Section 7.5 & 13.1)
 */

// GET /api/v1/projects/:projectId/tree (Endpoint #16)
export const getTreeSchema = z.object({
  params: z.object({
    projectId: z
      .string({ required_error: 'projectId is required' })
      .uuid({ message: 'Invalid projectId format (UUID required)' }),
  }),
});

// POST /api/v1/projects/:projectId/folders (Endpoint #17)
export const createFolderSchema = z.object({
  params: z.object({
    projectId: z
      .string({ required_error: 'projectId is required' })
      .uuid({ message: 'Invalid projectId format (UUID required)' }),
  }),
  body: z.object({
    name: z
      .string({ required_error: 'Folder name is required' })
      .trim()
      .min(LIMITS.NAME_MIN_LENGTH, { message: 'Folder name cannot be empty' })
      .max(LIMITS.NAME_MAX_LENGTH, { message: `Folder name cannot exceed ${LIMITS.NAME_MAX_LENGTH} characters` })
      .superRefine((val, ctx) => {
        const check = validateNodeName(val);
        if (!check.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: check.error,
          });
        }
      }),
    parentId: z
      .string()
      .uuid({ message: 'parentId must be a valid UUID' })
      .nullable()
      .optional(),
  }),
});
