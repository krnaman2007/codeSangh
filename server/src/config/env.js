import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  DIRECT_URL: process.env.DIRECT_URL || '',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  // Auth Configuration (Blueprint Section 4.1)
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'devsync-jwt-access-secret-default-change-me',
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  REFRESH_TOKEN_DAYS: parseInt(process.env.REFRESH_TOKEN_DAYS, 10) || 7,
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,

  // Judge0 Code Execution Configuration (Blueprint Section 4.1 & 8.0)
  JUDGE0_API_URL: process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com',
  JUDGE0_API_KEY: process.env.JUDGE0_API_KEY || '',
  JUDGE0_API_HOST: process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com',

  // Mastermind M3 Environments & Containers (Blueprint Section 4.1 & Page 8)
  DOCKER_SOCKET: process.env.DOCKER_SOCKET || '//./pipe/docker_engine',
  WORKSPACE_DIR: process.env.WORKSPACE_DIR || 'storage/workspaces',
  ENV_CONTAINER_CPUS: parseInt(process.env.ENV_CONTAINER_CPUS, 10) || 1,
  ENV_CONTAINER_MEMORY_MB: parseInt(process.env.ENV_CONTAINER_MEMORY_MB, 10) || 512,
  ENV_CONTAINER_PIDS: parseInt(process.env.ENV_CONTAINER_PIDS, 10) || 256,
  ENV_IDLE_MINUTES: parseInt(process.env.ENV_IDLE_MINUTES, 10) || 10,
  ENV_BUILD_TIMEOUT_SEC: parseInt(process.env.ENV_BUILD_TIMEOUT_SEC, 10) || 300,
  GIT_DATA_DIR: process.env.GIT_DATA_DIR || 'storage/git',

  // Real-Time Voice WebRTC Configuration (M4 - Blueprint Section 4.1 & Page 8)
  STUN_URLS: process.env.STUN_URLS || 'stun:stun.l.google.com:19302',
  TURN_URL: process.env.TURN_URL || 'turn:turn.example.com:3478',
  TURN_SECRET: process.env.TURN_SECRET || 'devsync-coturn-super-secret-key-change-me',
  TURN_CREDENTIAL_TTL_SEC: parseInt(process.env.TURN_CREDENTIAL_TTL_SEC, 10) || 3600,
  VOICE_MAX_PARTICIPANTS: parseInt(process.env.VOICE_MAX_PARTICIPANTS, 10) || 8,
};

export default env;
