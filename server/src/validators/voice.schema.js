// server/src/validators/voice.schema.js
// DevSync Voice WebRTC Validation Schemas (Endpoints #61, #62 - Mastermind M4)
// Blueprint Section 7.11 & 13.1

import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const voiceProjectParamSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
});

export const getIceServersSchema = voiceProjectParamSchema;
export const getVoiceSessionSchema = voiceProjectParamSchema;
