import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const collaboratorProjectParamSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
});

export const inviteCollaboratorSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z.object({
    email: z
      .string()
      .trim()
      .email({ message: 'Valid email is required' })
      .transform((val) => val.toLowerCase()),
    role: z.enum(['editor', 'viewer'], {
      errorMap: () => ({ message: "Role must be either 'editor' or 'viewer'" }),
    }),
  }),
});

export const updateCollaboratorRoleSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
    userId: z.string().regex(uuidRegex, { message: 'Invalid userId format' }),
  }),
  body: z.object({
    role: z.enum(['editor', 'viewer'], {
      errorMap: () => ({ message: "Role must be either 'editor' or 'viewer'" }),
    }),
  }),
});

export const collaboratorMemberParamsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
    userId: z.string().regex(uuidRegex, { message: 'Invalid userId format' }),
  }),
});
