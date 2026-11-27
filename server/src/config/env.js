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
};

export default env;
