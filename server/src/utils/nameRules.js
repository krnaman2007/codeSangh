/**
 * Node Name Validation Rules (Blueprint Section 13.1 & Page 7)
 * Rule: 1-100 chars; not '.' or '..'; no / \ : * ? " < > | or control characters.
 */

// Regex for characters not allowed in file/folder names
const FORBIDDEN_CHARS_REGEX = /[/\\:*?"<>|\x00-\x1F\x7F]/;

/**
 * Validates a file or folder name according to Blueprint rules
 * @param {string} name
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateNodeName(name) {
  if (typeof name !== 'string') {
    return { valid: false, error: 'Name must be a string' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 1 || trimmed.length > 100) {
    return { valid: false, error: 'Name must be between 1 and 100 characters' };
  }

  if (trimmed === '.' || trimmed === '..') {
    return { valid: false, error: "Name cannot be '.' or '..'" };
  }

  if (FORBIDDEN_CHARS_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Name cannot contain any of the following characters: / \\ : * ? " < > | or control characters',
    };
  }

  return { valid: true };
}
