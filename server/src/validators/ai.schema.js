// server/src/validators/ai.schema.js
// DevSync AI Coding Assistant Validation Schemas (Endpoint #63 - Mastermind M5)
// Blueprint Section 7.12 & Page 34-35

import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const aiChatSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z.object({
    conversationId: z
      .string()
      .regex(uuidRegex, { message: 'Invalid conversationId format' })
      .nullable()
      .optional(),
    message: z
      .string()
      .trim()
      .min(1, 'Message cannot be empty')
      .max(4000, 'Message cannot exceed 4,000 characters'),
    mode: z.enum(['ask', 'explain', 'fix', 'generate']).optional().default('ask'),
    context: z
      .object({
        fileId: z
          .string()
          .regex(uuidRegex, { message: 'Invalid fileId format' })
          .nullable()
          .optional(),
        selection: z
          .object({
            startLine: z.number().int().min(1),
            endLine: z.number().int().min(1),
          })
          .nullable()
          .optional(),
        includeLastError: z.boolean().optional().default(false),
      })
      .optional()
      .default({}),
  }),
});

export const listAiConversationsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  }),
});

export const aiConversationIdParamSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
    conversationId: z.string().regex(uuidRegex, { message: 'Invalid conversationId format' }),
  }),
});

export const aiCompleteSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z.object({
    fileId: z.string().regex(uuidRegex, { message: 'Invalid fileId format' }),
    language: z.string().trim().min(1, 'Language is required'),
    prefix: z.string().default(''),
    suffix: z.string().default(''),
    cursor: z.object({
      line: z.number().int().min(1),
      column: z.number().int().min(1),
    }),
  }),
});

