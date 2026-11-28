// server/src/validators/settings.schema.js
// DevSync Project Settings Validation Schemas (Endpoint #68 - Mastermind M5/M6)
// Blueprint Section 7.12 & Page 35

import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const updateProjectSettingsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z.object({
    aiEnabled: z.boolean({ required_error: 'aiEnabled boolean is required' }),
  }),
});

export const getProjectSettingsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
});
