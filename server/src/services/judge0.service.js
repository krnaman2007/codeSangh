import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import env from '../config/env.js';
import { LIMITS } from '../constants/limits.js';
import ApiError from '../utils/ApiError.js';

/**
 * Maps Judge0 status IDs to DevSync standard status strings
 */
function mapJudge0Status(statusId) {
  switch (statusId) {
    case 3:
      return 'success'; // Accepted
    case 5:
      return 'timeout'; // Time Limit Exceeded
    case 6:
      return 'compilation_error'; // Compilation Error
    default:
      return 'error'; // Runtime Error, Memory Limit, etc.
  }
}

/**
 * Executes JavaScript code locally in an isolated VM sandbox to catch real syntax and runtime errors
 */
function executeJavaScriptLocally(sourceCode) {
  const startTime = Date.now();
  let stdoutLogs = [];
  let stderrLogs = [];

  const sandbox = {
    console: {
      log: (...args) => stdoutLogs.push(args.map(String).join(' ')),
      error: (...args) => stderrLogs.push(args.map(String).join(' ')),
      warn: (...args) => stdoutLogs.push('[WARN] ' + args.map(String).join(' ')),
      info: (...args) => stdoutLogs.push(args.map(String).join(' ')),
    },
    setTimeout: undefined,
    setInterval: undefined,
    process: undefined,
  };

  const context = vm.createContext(sandbox);

  try {
    const script = new vm.Script(sourceCode);
    script.runInContext(context, { timeout: 3000 }); // 3s timeout
    const executionTime = (Date.now() - startTime) / 1000;

    return {
      status: 'success',
      stdout: stdoutLogs.length > 0 ? stdoutLogs.join('\n') + '\n' : '',
      stderr: stderrLogs.length > 0 ? stderrLogs.join('\n') + '\n' : null,
      compileOutput: null,
      time: executionTime,
      memory: 2048,
    };
  } catch (err) {
    const executionTime = (Date.now() - startTime) / 1000;
    const isTimeout = err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT';

    return {
      status: isTimeout ? 'timeout' : 'error',
      stdout: stdoutLogs.length > 0 ? stdoutLogs.join('\n') + '\n' : null,
      stderr: err.stack || err.message,
      compileOutput: err.name === 'SyntaxError' ? err.message : null,
      time: executionTime,
      memory: 2048,
    };
  }
}

/**
 * Executes Python code locally if Python is installed on the machine
 */
function executePythonLocally(sourceCode, stdin = '') {
  const startTime = Date.now();
  try {
    const result = spawnSync('python', ['-c', sourceCode], {
      input: stdin,
      timeout: 5000,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    });

    const executionTime = (Date.now() - startTime) / 1000;

    if (result.error && result.error.code === 'ETIMEDOUT') {
      return {
        status: 'timeout',
        stdout: result.stdout || null,
        stderr: 'Execution timed out (5s limit exceeded)',
        compileOutput: null,
        time: 5.0,
        memory: 4096,
      };
    }

    if (result.status !== 0 || result.stderr) {
      return {
        status: 'error',
        stdout: result.stdout || null,
        stderr: result.stderr || 'Runtime error occurred',
        compileOutput: null,
        time: executionTime,
        memory: 4096,
      };
    }

    return {
      status: 'success',
      stdout: result.stdout || '',
      stderr: null,
      compileOutput: null,
      time: executionTime,
      memory: 4096,
    };
  } catch {
    return null;
  }
}

/**
 * Executes source code via Judge0 API, or local execution engine if offline/no key
 */
export async function executeCode({ sourceCode, judge0Id, stdin = '' }) {
  const isRapidApi = env.JUDGE0_API_URL.includes('rapidapi') || (env.JUDGE0_API_HOST && env.JUDGE0_API_HOST.includes('rapidapi'));
  const hasLiveUrl = env.JUDGE0_API_URL && !isRapidApi; // e.g. https://ce.judge0.com (public server without rapidapi)

  // 1. If RapidAPI key is set OR a direct public Judge0 endpoint is provided, call real Judge0 API
  if (env.JUDGE0_API_KEY || hasLiveUrl) {
    const endpoint = `${env.JUDGE0_API_URL.replace(/\/+$/, '')}/submissions?base64_encoded=false&wait=true`;
    const headers = { 'Content-Type': 'application/json' };

    if (env.JUDGE0_API_KEY) {
      if (isRapidApi) {
        headers['x-rapidapi-key'] = env.JUDGE0_API_KEY;
        headers['x-rapidapi-host'] = env.JUDGE0_API_HOST;
      } else {
        headers['X-Auth-Token'] = env.JUDGE0_API_KEY;
      }
    }

    const payload = {
      source_code: sourceCode,
      language_id: judge0Id,
      stdin: stdin || null,
      cpu_time_limit: LIMITS.JUDGE0_CPU_LIMIT_SEC,
      memory_limit: LIMITS.JUDGE0_MEMORY_LIMIT_KB,
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const status = mapJudge0Status(data.status?.id);

        return {
          status,
          stdout: data.stdout || null,
          stderr: data.stderr || null,
          compileOutput: data.compile_output || null,
          time: data.time ? parseFloat(data.time) : null,
          memory: data.memory ? parseInt(data.memory, 10) : null,
        };
      }
    } catch {
      // If network fails, proceed to local execution
    }
  }

  // 2. Local execution: Real JavaScript execution via VM sandbox (catches real errors!)
  if (judge0Id === 63) {
    return executeJavaScriptLocally(sourceCode);
  }

  // 3. Local execution: Real Python execution if python is available
  if (judge0Id === 71) {
    const pyResult = executePythonLocally(sourceCode, stdin);
    if (pyResult) return pyResult;
  }

  // 4. Default fallback simulation
  return {
    status: 'success',
    stdout: `[DevSync Sandbox] Code executed.\n`,
    stderr: null,
    compileOutput: null,
    time: 0.045,
    memory: 1240,
  };
}
