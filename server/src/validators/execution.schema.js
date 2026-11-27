import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const runFileSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
    fileId: z.string().regex(uuidRegex, { message: 'Invalid fileId format' }),
  }),
  body: z.object({
    stdin: z
      .string()
      .max(LIMITS.STDIN_MAX_BYTES, {
        message: `stdin exceeds maximum allowed size of ${LIMITS.STDIN_MAX_BYTES / 1024} KB`,
      })
      .optional()
      .default(''),
    content: z
      .string()
      .max(LIMITS.FILE_CONTENT_MAX_BYTES, {
        message: 'Content exceeds maximum allowed size of 1 MB',
      })
      .optional(),
  }),
});

export const executionParamsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
    executionId: z.string().regex(uuidRegex, { message: 'Invalid executionId format' }),
  }),
});

export const listExecutionsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  }),
});
