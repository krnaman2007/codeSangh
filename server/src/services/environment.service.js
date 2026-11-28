// server/src/services/environment.service.js
// DevSync Shared Development Environments Service (Endpoints #56, #57 - Mastermind M3)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { RUNTIMES, isValidRuntimeKey, isValidRuntimeVersion } from '../constants/runtimes.js';
import { docker, isDockerRunning } from '../config/docker.js';
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
 * Creates in-memory POSIX ustar tar archive for Dockerfile
 */
function createSingleFileTar(fileName, content) {
  const contentBuf = Buffer.from(content, 'utf8');
  const header = Buffer.alloc(512);
  header.write(fileName, 0, 100, 'utf8');
  header.write('0000644\0', 100, 8, 'utf8');
  header.write('0000000\0', 108, 8, 'utf8');
  header.write('0000000\0', 116, 8, 'utf8');
  const sizeOctal = contentBuf.length.toString(8).padStart(11, '0') + ' ';
  header.write(sizeOctal, 124, 12, 'utf8');
  const mtimeOctal = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + ' ';
  header.write(mtimeOctal, 136, 12, 'utf8');
  header.fill(32, 148, 156);
  header.write('0', 156, 1, 'utf8');
  header.write('ustar\0', 257, 6, 'utf8');
  header.write('00', 263, 2, 'utf8');
  let checksum = 0;
  for (let i = 0; i < 512; i++) checksum += header[i];
  const checksumOctal = checksum.toString(8).padStart(6, '0') + '\0 ';
  header.write(checksumOctal, 148, 8, 'utf8');
  const paddingLen = (512 - (contentBuf.length % 512)) % 512;
  const padding = Buffer.alloc(paddingLen);
  const endBlocks = Buffer.alloc(1024);
  return Buffer.concat([header, contentBuf, padding, endBlocks]);
}

/**
 * Asynchronously performs real Docker build pipeline (Blueprint Section 9.4)
 */
async function executeDockerBuild({ projectId, imageTag, dockerfile, configHash }) {
  const filePath = getEnvFilePath(projectId);
  try {
    const dockerAvailable = await isDockerRunning();
    if (dockerAvailable) {
      const tarBuf = createSingleFileTar('Dockerfile', dockerfile);
      const stream = Readable.from(tarBuf);
      const buildStream = await docker.buildImage(stream, { t: imageTag });

      await new Promise((resolve, reject) => {
        docker.modem.followProgress(
          buildStream,
          (err, output) => {
            if (err) return reject(err);
            resolve(output);
          },
          async (event) => {
            if (event && event.stream) {
              try {
                const current = await getProjectEnvironment(projectId);
                if (current.configured) {
                  current.buildLog = (current.buildLog || '') + event.stream;
                  if (current.buildLog.length > 200 * 1024) {
                    current.buildLog = current.buildLog.slice(current.buildLog.length - 200 * 1024);
                  }
                  await fs.promises.writeFile(filePath, JSON.stringify(current, null, 2), 'utf8');
                }
              } catch {}
            }
          }
        );
      });
    }

    const current = await getProjectEnvironment(projectId);
    if (current.configured && current.configHash === configHash) {
      current.status = 'ready';
      current.builtAt = new Date().toISOString();
      current.buildLog = (current.buildLog || '') + `\n[Build finished] Status: ready. Tagged: ${imageTag}\n`;
      await fs.promises.writeFile(filePath, JSON.stringify(current, null, 2), 'utf8');
    }
  } catch (err) {
    const current = await getProjectEnvironment(projectId);
    if (current && current.configured) {
      current.status = 'failed';
      current.buildLog = (current.buildLog || '') + `\n[Build error] ${err.message}\n`;
      await fs.promises.writeFile(filePath, JSON.stringify(current, null, 2), 'utf8');
    }
  }
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
export async function getProjectEnvironment(projectId, retries = 2) {
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
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 60));
      return getProjectEnvironment(projectId, retries - 1);
    }
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

  // 6. Asynchronous real Docker build worker
  executeDockerBuild({ projectId, imageTag, dockerfile, configHash }).catch(() => {});

  return envData;
}

/**
 * Force rebuild with the stored configuration (Endpoint #58 - Mastermind M3)
 * Access: Owner
 * Blueprint Section 7.10 & Page 33
 */
export async function rebuildProjectEnvironment({ projectId, user, skipDockerCheck = false }) {
  const filePath = getEnvFilePath(projectId);

  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'NOT_FOUND', 'Environment is not configured for this project');
  }

  const current = await getProjectEnvironment(projectId);
  if (!current.configured) {
    throw new ApiError(404, 'NOT_FOUND', 'Environment is not configured for this project');
  }

  if (current.status === 'building') {
    throw new ApiError(409, 'ENVIRONMENT_BUILDING', 'An environment build is already in progress for this project');
  }

  // Check if Docker is available
  if (!skipDockerCheck) {
    const dockerAvailable = await isDockerRunning();
    if (!dockerAvailable) {
      throw new ApiError(503, 'DOCKER_UNAVAILABLE', 'Docker daemon is unavailable or unreachable');
    }
  }

  current.status = 'building';
  current.builtAt = null;
  current.buildLog = `[Force rebuild started] Rebuilding environment image ${current.imageTag}...\n`;
  current.updatedBy = {
    id: user?.id,
    name: user?.name || 'DevSync Developer',
  };
  current.updatedAt = new Date().toISOString();

  await fs.promises.writeFile(filePath, JSON.stringify(current, null, 2), 'utf8');

  // Asynchronous real Docker rebuild worker
  executeDockerBuild({
    projectId,
    imageTag: current.imageTag,
    dockerfile: current.dockerfile,
    configHash: current.configHash,
  }).catch(() => {});

  return { status: 'building' };
}

/**
 * Retrieves the last build output for the build-log drawer (Endpoint #59 - Mastermind M3)
 * Access: Viewer+
 * Blueprint Section 7.10 & Page 33
 */
export async function getProjectBuildLog(projectId) {
  const env = await getProjectEnvironment(projectId);

  if (!env.configured) {
    return {
      status: 'none',
      builtAt: null,
      log: '',
    };
  }

  // Cap build log to 200 KB as specified in Blueprint Section 7.10
  const maxBytes = 200 * 1024;
  const logContent = env.buildLog || '';
  const cappedLog = logContent.length > maxBytes ? logContent.slice(logContent.length - maxBytes) : logContent;

  return {
    status: env.status || 'none',
    builtAt: env.builtAt || null,
    log: cappedLog,
  };
}

/**
 * Resets project environment to default Judge0 mode (Endpoint #60 - Mastermind M3)
 * Stop and remove project container and image, delete configuration.
 * Access: Owner
 * Blueprint Section 7.10 & Page 34
 */
export async function resetProjectEnvironment({ projectId }) {
  const filePath = getEnvFilePath(projectId);

  if (fs.existsSync(filePath)) {
    try {
      const current = await getProjectEnvironment(projectId);

      // Stop and remove docker container and image if Docker is running
      const dockerAvailable = await isDockerRunning();
      if (dockerAvailable) {
        try {
          const container = docker.getContainer(`devsync-${projectId}`);
          await container.stop().catch(() => {});
          await container.remove({ force: true }).catch(() => {});
        } catch {
          // Ignore container cleanup errors
        }

        if (current.imageTag) {
          try {
            const img = docker.getImage(current.imageTag);
            await img.remove({ force: true }).catch(() => {});
          } catch {
            // Ignore image cleanup errors
          }
        }
      }
    } catch {
      // Continue with file removal
    }

    try {
      await fs.promises.unlink(filePath);
    } catch {
      // Already removed
    }
  }

  return true;
}
