import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const gitUrlRegex = /^(https?:\/\/|git@).+/i;

export const gitRepoParamSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
});

export const initGitSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z.object({
    defaultBranch: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .regex(/^[a-zA-Z0-9_.-]+$/, {
        message: 'Branch name can only contain letters, numbers, dots, hyphens, and underscores',
      })
      .optional()
      .default('main'),
  }),
});

export const setRemoteSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z.object({
    url: z
      .string()
      .trim()
      .regex(gitUrlRegex, { message: 'Valid Git remote URL (HTTPS or SSH) is required' }),
    token: z.string().trim().optional(),
    name: z.string().trim().min(1).max(50).optional().default('origin'),
  }),
});

export const cloneGitSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z.object({
    url: z
      .string()
      .trim()
      .regex(gitUrlRegex, { message: 'Valid Git remote URL (HTTPS or SSH) is required' }),
    token: z.string().trim().optional(),
    branch: z.string().trim().min(1).max(50).optional().default('main'),
  }),
});

export const stagePathsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z.object({
    paths: z
      .array(
        z
          .string()
          .trim()
          .min(1, 'Path cannot be empty')
          .regex(/^(?!\.\.)(?!.*\/\.\.)/, 'Path traversal with .. is forbidden')
      )
      .min(1, 'At least one path is required'),
  }),
});

export const unstagePathsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z.object({
    paths: z
      .array(
        z
          .string()
          .trim()
          .min(1, 'Path cannot be empty')
          .regex(/^(?!\.\.)(?!.*\/\.\.)/, 'Path traversal with .. is forbidden')
      )
      .min(1, 'At least one path is required'),
  }),
});

export const discardPathsSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z.object({
    paths: z
      .array(
        z
          .string()
          .trim()
          .min(1, 'Path cannot be empty')
          .regex(/^(?!\.\.)(?!.*\/\.\.)/, 'Path traversal with .. is forbidden')
      )
      .min(1, 'At least one path is required'),
  }),
});

export const commitGitSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z.object({
    message: z
      .string()
      .trim()
      .min(1, 'Commit message cannot be empty')
      .max(500, 'Commit message cannot exceed 500 characters'),
  }),
});

export const gitLogSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  query: z.object({
    branch: z.string().trim().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const gitDiffSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  query: z.object({
    path: z
      .string()
      .trim()
      .min(1, 'Path is required')
      .regex(/^(?!\.\.)(?!.*\/\.\.)/, 'Path traversal with .. is forbidden'),
    staged: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .optional()
      .transform((v) => v === true || v === 'true'),
    commit: z
      .string()
      .trim()
      .regex(/^[0-9a-f]{40}$/i, 'Commit must be a 40-character SHA hash')
      .optional(),
  }),
});

export const gitBranchesSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
});

export const createBranchSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Branch name cannot be empty')
      .max(100, 'Branch name cannot exceed 100 characters')
      .regex(/^[A-Za-z0-9._/-]{1,100}$/, 'Branch name contains invalid characters')
      .refine((val) => !val.includes('..') && !val.startsWith('-'), {
        message: 'Branch name cannot contain ".." or start with "-"',
      }),
    from: z.string().trim().min(1).max(100).optional(),
    checkout: z.boolean().optional().default(false),
  }),
});

export const checkoutBranchSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z.object({
    branch: z.string().trim().min(1, 'Branch name is required').max(100),
    force: z.boolean().optional().default(false),
  }),
});

export const deleteBranchSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
    name: z.string().trim().min(1, 'Branch name is required'),
  }),
});

export const pullGitSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z
    .object({
      branch: z.string().trim().min(1).max(100).optional(),
    })
    .optional()
    .default({}),
});

export const pushGitSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z
    .object({
      branch: z.string().trim().min(1).max(100).optional(),
    })
    .optional()
    .default({}),
});
