// server/src/validators/environment.schema.js
// DevSync Environment Schemas (Endpoints #56, #57 - Mastermind M3)

import { z } from 'zod';
import { isValidRuntimeKey, isValidRuntimeVersion, RUNTIMES } from '../constants/runtimes.js';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const envKeyRegex = /^[A-Z_][A-Z0-9_]*$/;
const versionRegex = /^[0-9A-Za-z.+_-]{1,40}$/;

const npmNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const pipNameRegex = /^[A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?$/;
const aptNameRegex = /^[a-z0-9][a-z0-9+.-]+$/;

const dependencySchema = z
  .object({
    manager: z.enum(['npm', 'pip', 'apt']),
    name: z.string().trim().min(1, 'Dependency name cannot be empty'),
    version: z.string().trim().regex(versionRegex, {
      message: 'Invalid version format (must match ^[0-9A-Za-z.+_-]{1,40}$)',
    }),
  })
  .refine(
    (dep) => {
      if (dep.manager === 'npm') return npmNameRegex.test(dep.name);
      if (dep.manager === 'pip') return pipNameRegex.test(dep.name);
      if (dep.manager === 'apt') return aptNameRegex.test(dep.name);
      return false;
    },
    { message: 'Invalid package name format for selected package manager' }
  );

export const environmentProjectIdSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
});

export const saveEnvironmentSchema = z.object({
  params: z.object({
    projectId: z.string().regex(uuidRegex, { message: 'Invalid projectId format' }),
  }),
  body: z
    .object({
      runtime: z.string().trim().min(1, 'Runtime is required'),
      runtimeVersion: z.string().trim().min(1, 'Runtime version is required'),
      dependencies: z.array(dependencySchema).max(50, 'Cannot exceed 50 dependencies').optional().default([]),
      envVars: z
        .record(
          z.string().regex(envKeyRegex, {
            message: 'Env var key must match ^[A-Z_][A-Z0-9_]*$',
          }),
          z.string().max(500, 'Env var value cannot exceed 500 characters')
        )
        .optional()
        .default({}),
      setupCommand: z.string().trim().max(500, 'Setup command cannot exceed 500 characters').nullable().optional(),
      runCommand: z.string().trim().max(500, 'Run command cannot exceed 500 characters').nullable().optional(),
      executionMode: z.enum(['environment', 'judge0']).optional().default('environment'),
    })
    .refine(
      (data) => isValidRuntimeKey(data.runtime),
      {
        message: 'Runtime is not supported in the catalogue',
        path: ['runtime'],
      }
    )
    .refine(
      (data) => isValidRuntimeVersion(data.runtime, data.runtimeVersion),
      {
        message: 'Runtime version is not supported for this runtime',
        path: ['runtimeVersion'],
      }
    )
    .refine(
      (data) => {
        const allowedManagers = RUNTIMES[data.runtime]?.managers || [];
        return data.dependencies.every((dep) => allowedManagers.includes(dep.manager));
      },
      {
        message: 'One or more dependencies use a manager not supported by this runtime',
        path: ['dependencies'],
      }
    ),
});
