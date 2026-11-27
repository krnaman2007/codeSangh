/**
 * Application Limits (Blueprint Section 4.3 - constants/limits.js)
 */
export const LIMITS = {
  PROJECTS_PER_USER: 50, // POST /projects
  NODES_PER_PROJECT: 500, // POST /folders, /files
  FOLDER_NESTING_DEPTH: 8, // create / move
  NAME_MIN_LENGTH: 1, // validators + CHECK constraint
  NAME_MAX_LENGTH: 100, // validators + CHECK constraint
  FILE_CONTENT_MAX_BYTES: 1_000_000, // 1 MB (Yjs update guard, PUT content)
  COLLABORATORS_PER_PROJECT: 20, // POST /collaborators
  STDIN_MAX_BYTES: 64 * 1024, // 64 KB
  RUN_RATE_LIMIT: 10, // 10 runs / minute / user
  EXECUTION_HISTORY_LIMIT: 500, // latest 500 per project (auto-prune)
  JUDGE0_CPU_LIMIT_SEC: 5,
  JUDGE0_MEMORY_LIMIT_KB: 128_000,
  VOICE_MAX_PARTICIPANTS: 8, // 8 (mesh)
};

export default LIMITS;
