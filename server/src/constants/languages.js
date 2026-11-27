/**
 * Language Registry (Blueprint Section 4.2)
 * Single source of truth, shared by server and client.
 * Shape: { key, label, ext, monaco, judge0Id, mode, debug, debugAdapter, envRuntime }
 */
export const LANGUAGES = [
  {
    key: 'javascript',
    label: 'JavaScript',
    ext: '.js',
    monaco: 'javascript',
    judge0Id: 63, // Node.js
    mode: 'run',
    debug: true,
    debugAdapter: 'js-debug',
    envRuntime: 'node',
  },
  {
    key: 'python',
    label: 'Python',
    ext: '.py',
    monaco: 'python',
    judge0Id: 71, // Python 3
    mode: 'run',
    debug: true,
    debugAdapter: 'debugpy',
    envRuntime: 'python',
  },
  {
    key: 'java',
    label: 'Java',
    ext: '.java',
    monaco: 'java',
    judge0Id: 62, // Java (OpenJDK)
    mode: 'run',
    debug: true,
    debugAdapter: 'java-debug',
    envRuntime: 'java',
  },
  {
    key: 'cpp',
    label: 'C++',
    ext: '.cpp',
    monaco: 'cpp',
    judge0Id: 54, // GCC
    mode: 'run',
    debug: true,
    debugAdapter: 'GDB DAP',
    envRuntime: 'cpp',
  },
  {
    key: 'html',
    label: 'HTML',
    ext: '.html',
    monaco: 'html',
    judge0Id: null,
    mode: 'preview',
    debug: false,
    debugAdapter: null,
    envRuntime: null,
  },
  {
    key: 'css',
    label: 'CSS',
    ext: '.css',
    monaco: 'css',
    judge0Id: null,
    mode: 'none',
    debug: false,
    debugAdapter: null,
    envRuntime: null,
  },
  {
    key: 'text',
    label: 'Plain text',
    ext: '.txt',
    monaco: 'plaintext',
    judge0Id: null,
    mode: 'none',
    debug: false,
    debugAdapter: null,
    envRuntime: null,
  },
];

export const LANGUAGE_KEYS = LANGUAGES.map((lang) => lang.key);
export const RUNNABLE_LANGUAGES = LANGUAGES.filter((lang) => lang.mode === 'run').map((lang) => lang.key);

const MAP_BY_KEY = new Map(LANGUAGES.map((lang) => [lang.key, lang]));
const MAP_BY_EXT = new Map(LANGUAGES.map((lang) => [lang.ext, lang]));

export function getLanguageByKey(key) {
  return MAP_BY_KEY.get(key) || null;
}

export function getLanguageByExt(ext) {
  return MAP_BY_EXT.get(ext) || null;
}

export function isValidLanguageKey(key) {
  return MAP_BY_KEY.has(key);
}
