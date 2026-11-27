/**
 * Debug Service (Mastermind Feature M1 - Collaborative Debugging)
 * Manages DAP session initialization, breakpoint resolution, and execution frames.
 */

/**
 * Normalizes breakpoints input to a consistent structure
 * Supports both array of numbers `[10, 20]` and array of objects `[{ line: 10 }]`
 */
export function normalizeBreakpoints(rawBreakpoints = [], totalLines = 100) {
  if (!Array.isArray(rawBreakpoints)) return [];

  return rawBreakpoints
    .map((bp) => {
      if (typeof bp === 'number') {
        return { line: Math.max(1, Math.min(bp, totalLines)), verified: true };
      }
      if (typeof bp === 'object' && bp !== null && typeof bp.line === 'number') {
        return {
          line: Math.max(1, Math.min(bp.line, totalLines)),
          condition: bp.condition || null,
          verified: true,
        };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Initializes debugging session state based on source code and breakpoints
 */
export function initializeDebugSession({ sourceCode, fileName, breakpoints = [] }) {
  const lines = (sourceCode || '').split(/\r?\n/);
  const totalLines = Math.max(1, lines.length);

  const normalizedBp = normalizeBreakpoints(breakpoints, totalLines);

  // Initial paused line: first breakpoint line, or line 1
  const firstBp = normalizedBp[0];
  const currentLine = firstBp ? firstBp.line : 1;

  // Extract initial declared variables in scope (basic static analysis)
  const variables = {
    scope: 'local',
  };

  const declaredVars = [];
  lines.forEach((lineText, idx) => {
    if (idx + 1 > currentLine) return; // only variables up to current paused line
    const match = lineText.match(/(?:const|let|var|def|\$)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (match && match[1]) {
      declaredVars.push(match[1]);
    }
  });

  declaredVars.forEach((v) => {
    variables[v] = 'undefined';
  });

  // Call stack frame
  const callStack = [
    {
      id: 1,
      name: '<module>',
      file: fileName,
      line: currentLine,
      column: 1,
    },
  ];

  return {
    breakpoints: normalizedBp,
    currentLine,
    variables,
    callStack,
  };
}
