// server/src/config/docker.js
// DevSync Dockerode Connection Configuration (Blueprint Section 3.1 & 9.4)

import Docker from 'dockerode';
import process from 'node:process';

const isWindows = process.platform === 'win32';

export const docker = new Docker(
  isWindows
    ? { socketPath: '//./pipe/docker_engine' }
    : { socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' }
);

/**
 * Checks if Docker daemon is actively running and reachable
 */
export async function isDockerRunning() {
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
}

export default docker;
