import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';

/**
 * Validation schemas for Projects module (Blueprint Section 7.4 & 13.1)
 */

// POST /api/v1/projects (Endpoint #12)
// Blueprint rule: Only the name is accepted; any language field in the body is rejected/ignored.
export const createProjectSchema = z.object({
  body: z
    .object({
      name: z
        .string({ required_error: 'Project name is required' })
        .trim()
        .min(LIMITS.NAME_MIN_LENGTH, { message: 'Project name cannot be empty' })
        .max(LIMITS.NAME_MAX_LENGTH, { message: `Project name cannot exceed ${LIMITS.NAME_MAX_LENGTH} characters` }),
    })
    .passthrough(), // Accepts body but only name is picked by controller
});

// GET /api/v1/projects?search=port (Endpoint #11)
export const getProjectsSchema = z.object({
  query: z
    .object({
      search: z.string().trim().optional(),
    })
    .optional(),
});

// GET /api/v1/projects/:projectId (Endpoint #13) and DELETE /api/v1/projects/:projectId (Endpoint #15)
export const projectIdParamSchema = z.object({
  params: z.object({
    projectId: z
      .string({ required_error: 'projectId is required' })
      .uuid({ message: 'Invalid projectId format (UUID required)' }),
  }),
});

// PATCH /api/v1/projects/:projectId (Endpoint #14)
export const renameProjectSchema = z.object({
  params: z.object({
    projectId: z
      .string({ required_error: 'projectId is required' })
      .uuid({ message: 'Invalid projectId format (UUID required)' }),
  }),
  body: z.object({
    name: z
      .string({ required_error: 'Project name is required' })
      .trim()
      .min(LIMITS.NAME_MIN_LENGTH, { message: 'Project name cannot be empty' })
      .max(LIMITS.NAME_MAX_LENGTH, { message: `Project name cannot exceed ${LIMITS.NAME_MAX_LENGTH} characters` }),
  }),
});
