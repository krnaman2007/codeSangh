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

// POST /api/v1/projects/:projectId/files (Endpoint #18)
export const createFileSchema = z.object({
  params: z.object({
    projectId: z
      .string({ required_error: 'projectId is required' })
      .uuid({ message: 'Invalid projectId format (UUID required)' }),
  }),
  body: z.object({
    name: z
      .string({ required_error: 'File name is required' })
      .trim()
      .min(LIMITS.NAME_MIN_LENGTH, { message: 'File name cannot be empty' })
      .max(LIMITS.NAME_MAX_LENGTH, { message: `File name cannot exceed ${LIMITS.NAME_MAX_LENGTH} characters` })
      .superRefine((val, ctx) => {
        const check = validateNodeName(val);
        if (!check.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: check.error,
          });
        }
      }),
    language: z
      .string({ required_error: 'Language is required' })
      .trim()
      .min(1, { message: 'Language is required' }),
    parentId: z
      .string()
      .uuid({ message: 'parentId must be a valid UUID' })
      .nullable()
      .optional(),
    content: z
      .string()
      .max(LIMITS.FILE_CONTENT_MAX_BYTES, { message: 'Content cannot exceed 1 MB' })
      .optional()
      .default(''),
  }),
});

// GET /api/v1/projects/:projectId/files/:fileId (Endpoint #19)
export const fileIdParamSchema = z.object({
  params: z.object({
    projectId: z
      .string({ required_error: 'projectId is required' })
      .uuid({ message: 'Invalid projectId format (UUID required)' }),
    fileId: z
      .string({ required_error: 'fileId is required' })
      .uuid({ message: 'Invalid fileId format (UUID required)' }),
  }),
});

// PUT /api/v1/projects/:projectId/files/:fileId/content (Endpoint #20)
export const updateContentSchema = z.object({
  params: z.object({
    projectId: z
      .string({ required_error: 'projectId is required' })
      .uuid({ message: 'Invalid projectId format (UUID required)' }),
    fileId: z
      .string({ required_error: 'fileId is required' })
      .uuid({ message: 'Invalid fileId format (UUID required)' }),
  }),
  body: z.object({
    content: z
      .string({ required_error: 'content is required' })
      .max(LIMITS.FILE_CONTENT_MAX_BYTES, { message: 'File content cannot exceed 1 MB' }),
  }),
});

// PATCH /api/v1/projects/:projectId/nodes/:nodeId (Endpoint #21)
export const renameNodeSchema = z.object({
  params: z.object({
    projectId: z
      .string({ required_error: 'projectId is required' })
      .uuid({ message: 'Invalid projectId format (UUID required)' }),
    nodeId: z
      .string({ required_error: 'nodeId is required' })
      .uuid({ message: 'Invalid nodeId format (UUID required)' }),
  }),
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(LIMITS.NAME_MIN_LENGTH, { message: 'Name cannot be empty' })
      .max(LIMITS.NAME_MAX_LENGTH, { message: `Name cannot exceed ${LIMITS.NAME_MAX_LENGTH} characters` })
      .superRefine((val, ctx) => {
        const check = validateNodeName(val);
        if (!check.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: check.error,
          });
        }
      }),
  }),
});

// PATCH /api/v1/projects/:projectId/nodes/:nodeId/move (Endpoint #22)
export const moveNodeSchema = z.object({
  params: z.object({
    projectId: z
      .string({ required_error: 'projectId is required' })
      .uuid({ message: 'Invalid projectId format (UUID required)' }),
    nodeId: z
      .string({ required_error: 'nodeId is required' })
      .uuid({ message: 'Invalid nodeId format (UUID required)' }),
  }),
  body: z.object({
    parentId: z
      .string({ required_error: 'parentId is required (or null for root)' })
      .uuid({ message: 'parentId must be a valid UUID' })
      .nullable(),
  }),
});

// PATCH /api/v1/projects/:projectId/files/:fileId/language (Endpoint #23)
export const changeLanguageSchema = z.object({
  params: z.object({
    projectId: z
      .string({ required_error: 'projectId is required' })
      .uuid({ message: 'Invalid projectId format (UUID required)' }),
    fileId: z
      .string({ required_error: 'fileId is required' })
      .uuid({ message: 'Invalid fileId format (UUID required)' }),
  }),
  body: z.object({
    language: z
      .string({ required_error: 'Language is required' })
      .trim()
      .min(1, { message: 'Language is required' }),
  }),
});

// DELETE /api/v1/projects/:projectId/nodes/:nodeId (Endpoint #24)
export const nodeIdParamSchema = z.object({
  params: z.object({
    projectId: z
      .string({ required_error: 'projectId is required' })
      .uuid({ message: 'Invalid projectId format (UUID required)' }),
    nodeId: z
      .string({ required_error: 'nodeId is required' })
      .uuid({ message: 'Invalid nodeId format (UUID required)' }),
  }),
});
