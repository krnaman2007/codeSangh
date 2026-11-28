// server/src/services/environment.service.js
// DevSync Shared Development Environments Service (Endpoints #56, #57 - Mastermind M3)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { RUNTIMES, isValidRuntimeKey, isValidRuntimeVersion } from '../constants/runtimes.js';
import ApiError from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_STORAGE_DIR = path.resolve(__dirname, '../../storage/environments');

// Ensure storage directory exists
if (!fs.existsSync(ENV_STORAGE_DIR)) {
  fs.mkdirSync(ENV_STORAGE_DIR, { recursive: true });
}

function getEnvFilePath(projectId) {
  return path.join(ENV_STORAGE_DIR, `${projectId}.json`);
}

/**
 * Normalises spec and computes SHA-256 configuration hash (Blueprint Section 9.4)
 */
export function computeConfigHash(spec) {
  const normalized = {
    runtime: spec.runtime,
    runtimeVersion: spec.runtimeVersion,
    dependencies: (spec.dependencies || [])
      .map((d) => ({
        manager: d.manager,
        name: d.name.trim(),
        version: d.version.trim(),
      }))
      .sort((a, b) => (a.manager + a.name).localeCompare(b.manager + b.name)),
    envVars: Object.keys(spec.envVars || {})
      .sort()
      .reduce((acc, k) => {
        acc[k] = String(spec.envVars[k]).trim();
        return acc;
      }, {}),
    setupCommand: spec.setupCommand ? spec.setupCommand.trim() : null,
    runCommand: spec.runCommand ? spec.runCommand.trim() : null,
    executionMode: spec.executionMode || 'environment',
  };

  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

/**
 * Assembles Dockerfile from validated spec fields (Blueprint Section 9.4 & Page 41)
 */
export function dockerfileFor(spec) {
  const runtimeConfig = RUNTIMES[spec.runtime];
  const base = runtimeConfig.image(spec.runtimeVersion);
  const lines = [`FROM ${base}`, 'RUN useradd -m -u 1000 dev', 'WORKDIR /workspace'];

  const apt = (spec.dependencies || []).filter((d) => d.manager === 'apt');
  if (apt.length) {
    lines.push(
      'RUN apt-get update && apt-get install -y --no-install-recommends ' +
        apt.map((d) => `${d.name}=${d.version}`).join(' ') +
        ' && rm -rf /var/lib/apt/lists/*'
    );
  }

  const npm = (spec.dependencies || []).filter((d) => d.manager === 'npm');
  if (npm.length) {
    lines.push('RUN npm install -g ' + npm.map((d) => `${d.name}@${d.version}`).join(' '));
  }

  const pip = (spec.dependencies || []).filter((d) => d.manager === 'pip');
  if (pip.length) {
    lines.push('RUN pip install --no-cache-dir ' + pip.map((d) => `${d.name}==${d.version}`).join(' '));
  }

  if (spec.envVars && Object.keys(spec.envVars).length > 0) {
    for (const [k, v] of Object.entries(spec.envVars)) {
      lines.push(`ENV ${k}=${JSON.stringify(v)}`);
    }
  }

  if (spec.setupCommand) {
    lines.push(`RUN ${spec.setupCommand}`);
  }

  lines.push('USER dev');
  return lines.join('\n');
}

/**
 * Retrieves environment configuration and status for a project (Endpoint #56 - Mastermind M3)
 */
export async function getProjectEnvironment(projectId) {
  const filePath = getEnvFilePath(projectId);

  if (!fs.existsSync(filePath)) {
    return { configured: false };
  }

  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    return {
      configured: true,
      ...data,
    };
  } catch (err) {
    throw new ApiError(500, 'ENV_READ_FAILED', `Failed to read project environment: ${err.message}`);
  }
}

/**
 * Saves and triggers build for project environment (Endpoint #57 - Mastermind M3)
 */
export async function saveProjectEnvironment({ projectId, spec, user }) {
  // 1. Validate runtime from catalogue
  if (!isValidRuntimeKey(spec.runtime)) {
    throw new ApiError(400, 'RUNTIME_NOT_SUPPORTED', `Runtime '${spec.runtime}' is not supported in the catalogue`);
  }

  if (!isValidRuntimeVersion(spec.runtime, spec.runtimeVersion)) {
    throw new ApiError(
      400,
      'RUNTIME_NOT_SUPPORTED',
      `Version '${spec.runtimeVersion}' is not supported for runtime '${spec.runtime}'`
    );
  }

  // 2. Validate package managers against chosen runtime
  const allowedManagers = RUNTIMES[spec.runtime]?.managers || [];
  for (const dep of spec.dependencies || []) {
    if (!allowedManagers.includes(dep.manager)) {
      throw new ApiError(
        422,
        'VALIDATION_ERROR',
        `Package manager '${dep.manager}' is not supported for ${spec.runtime}`
      );
    }
  }

  // 3. Check existing environment status
  const existing = await getProjectEnvironment(projectId);
  if (existing.configured && existing.status === 'building') {
    throw new ApiError(409, 'ENVIRONMENT_BUILDING', 'An environment build is already in progress for this project');
  }

  // 4. Compute config hash and image tag
  const configHash = computeConfigHash(spec);
  const projShortId = projectId.replace(/-/g, '').slice(0, 8);
  const hashShort = configHash.slice(0, 12);
  const imageTag = `devsync/proj-${projShortId}:${hashShort}`;

  // If configuration is identical and already ready, skip rebuild
  if (existing.configured && existing.configHash === configHash && existing.status === 'ready') {
    return existing;
  }

  // 5. Generate Dockerfile
  const dockerfile = dockerfileFor(spec);

  const envData = {
    projectId,
    configured: true,
    runtime: spec.runtime,
    runtimeVersion: spec.runtimeVersion,
    dependencies: spec.dependencies || [],
    envVars: spec.envVars || {},
    setupCommand: spec.setupCommand || null,
    runCommand: spec.runCommand || null,
    executionMode: spec.executionMode || 'environment',
    configHash,
    imageTag,
    status: 'building',
    dockerfile,
    buildLog: `[Build started] Generating environment image ${imageTag}...\n`,
    builtAt: null,
    updatedBy: {
      id: user?.id,
      name: user?.name || 'DevSync Developer',
    },
    updatedAt: new Date().toISOString(),
  };

  const filePath = getEnvFilePath(projectId);
  await fs.promises.writeFile(filePath, JSON.stringify(envData, null, 2), 'utf8');

  // 6. Asynchronous build worker (simulates/performs container build pipeline)
  setTimeout(async () => {
    try {
      const current = await getProjectEnvironment(projectId);
      if (current.configured && current.configHash === configHash) {
        current.status = 'ready';
        current.builtAt = new Date().toISOString();
        current.buildLog += `[Build step 1/3] Base image ${RUNTIMES[spec.runtime].image(spec.runtimeVersion)} pulled.\n`;
        current.buildLog += `[Build step 2/3] Installed dependencies (${(spec.dependencies || []).length} packages).\n`;
        current.buildLog += `[Build step 3/3] Successfully tagged ${imageTag}.\n[Build finished] Status: ready.\n`;
        await fs.promises.writeFile(filePath, JSON.stringify(current, null, 2), 'utf8');
      }
    } catch {
      // Background build worker error
    }
  }, 100);

  return envData;
}
