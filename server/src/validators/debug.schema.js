import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const startDebugSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
    fileId: z.string().regex(uuidRegex, { message: 'Invalid fileId format' }),
  }),
  body: z.object({
    breakpoints: z
      .array(
        z.union([
          z.number().int().positive(),
          z.object({
            line: z.number().int().positive(),
            condition: z.string().optional(),
          }),
        ])
      )
      .optional()
      .default([]),
    args: z.union([z.string(), z.array(z.string())]).optional(),
  }),
});

export const activeDebugSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
});

export const stopDebugSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
    sessionId: z.string().regex(uuidRegex, { message: 'Invalid sessionId format' }),
  }),
});

export const fileBreakpointsParamsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
    fileId: z.string().regex(uuidRegex, { message: 'Invalid fileId format' }),
  }),
});

export const replaceBreakpointsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
    fileId: z.string().regex(uuidRegex, { message: 'Invalid fileId format' }),
  }),
  body: z.object({
    breakpoints: z
      .array(
        z.union([
          z.number().int().positive(),
          z.object({
            line: z.number().int().positive(),
            condition: z.string().optional(),
          }),
        ])
      )
      .max(100, { message: 'Maximum 100 breakpoints allowed per file' }),
  }),
});
