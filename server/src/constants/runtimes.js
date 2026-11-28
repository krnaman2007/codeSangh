// server/src/constants/runtimes.js
// DevSync Environment Runtime Catalogue (Blueprint Section 4.2 & 7.10, Page 32 & 41)

export const RUNTIMES = {
  node: {
    key: 'node',
    label: 'Node.js',
    versions: ['18', '20', '22'],
    defaultVersion: '20',
    managers: ['npm', 'apt'],
    languages: ['javascript'],
    image: (v) => `node:${v}-bookworm-slim`,
  },
  python: {
    key: 'python',
    label: 'Python',
    versions: ['3.10', '3.11', '3.12'],
    defaultVersion: '3.12',
    managers: ['pip', 'apt'],
    languages: ['python'],
    image: (v) => `python:${v}-slim`,
  },
  java: {
    key: 'java',
    label: 'Java (OpenJDK)',
    versions: ['17', '21'],
    defaultVersion: '21',
    managers: ['apt'],
    languages: ['java'],
    image: (v) => `eclipse-temurin:${v}-jdk`,
  },
  cpp: {
    key: 'cpp',
    label: 'C++ (GCC)',
    versions: ['12', '13'],
    defaultVersion: '13',
    managers: ['apt'],
    languages: ['cpp', 'c'],
    image: (v) => `gcc:${v}`,
  },
};

/**
 * Public catalog returned to frontend for RuntimePicker (Blueprint Section 7.10)
 */
export const RUNTIME_CATALOGUE = Object.values(RUNTIMES).map((r) => ({
  key: r.key,
  label: r.label,
  versions: r.versions,
  defaultVersion: r.defaultVersion,
  managers: r.managers,
  languages: r.languages,
}));

export function getRuntimeByKey(key) {
  return RUNTIMES[key] || null;
}

export function isValidRuntimeKey(key) {
  return Boolean(RUNTIMES[key]);
}

export function isValidRuntimeVersion(runtimeKey, version) {
  const runtime = RUNTIMES[runtimeKey];
  if (!runtime) return false;
  return runtime.versions.includes(version);
}
