import type { SupportedLanguage } from '../types/devsync';

export type TokenType =
  | 'keyword'
  | 'function'
  | 'string'
  | 'number'
  | 'comment'
  | 'plain';

export interface SyntaxToken {
  type: TokenType;
  value: string;
}

/**
 * Exact custom syntax highlighting palette from the DevSync visual specification:
 * - Keywords: #A78BFA (soft lavender)
 * - Functions: #60A5FA (muted sky)
 * - Strings: #34D399 (desaturated emerald)
 * - Numbers / Constants: #FBBF24 (warm amber)
 * - Comments: #525263 (italic slate)
 * - Variables / Plain Text: #E4E4E7
 */
export const TOKEN_STYLES: Record<TokenType, { color: string; italic?: boolean }> = {
  keyword: { color: '#A78BFA' },
  function: { color: '#60A5FA' },
  string: { color: '#34D399' },
  number: { color: '#FBBF24' },
  comment: { color: '#525263', italic: true },
  plain: { color: '#E4E4E7' },
};

const KEYWORDS: Record<SupportedLanguage, Set<string>> = {
  javascript: new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'switch', 'case', 'break', 'continue', 'async', 'await', 'new', 'class',
    'extends', 'import', 'export', 'from', 'default', 'try', 'catch', 'finally',
    'throw', 'typeof', 'instanceof', 'of', 'in', 'true', 'false', 'null', 'undefined',
  ]),
  python: new Set([
    'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not',
    'and', 'or', 'is', 'import', 'from', 'as', 'with', 'try', 'except', 'finally',
    'raise', 'yield', 'lambda', 'pass', 'break', 'continue', 'True', 'False', 'None',
    'async', 'await', 'global', 'nonlocal',
  ]),
  cpp: new Set([
    'int', 'long', 'double', 'float', 'char', 'bool', 'void', 'auto', 'const',
    'static', 'struct', 'class', 'public', 'private', 'protected', 'return',
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'using', 'namespace', 'include', 'template', 'typename', 'nullptr', 'true',
    'false', 'new', 'delete', 'sizeof', 'std', 'vector', 'queue', 'string', 'unordered_map',
  ]),
  java: new Set([
    'public', 'private', 'protected', 'class', 'interface', 'extends', 'implements',
    'static', 'final', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char',
    'new', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break',
    'continue', 'import', 'package', 'try', 'catch', 'finally', 'throw', 'throws',
    'this', 'super', 'true', 'false', 'null', 'String', 'var',
  ]),
  html: new Set([
    'html', 'head', 'body', 'main', 'section', 'article', 'header', 'footer',
    'nav', 'div', 'span', 'h1', 'h2', 'h3', 'p', 'a', 'button', 'ul', 'li',
    'form', 'input', 'label', 'meta', 'title', 'link', 'script', 'style', 'DOCTYPE',
  ]),
  css: new Set([
    'display', 'grid', 'flex', 'position', 'color', 'background', 'background-color',
    'border', 'padding', 'margin', 'gap', 'width', 'height', 'font-family',
    'font-size', 'line-height', 'border-radius', 'transition', 'opacity', 'root',
    'media', 'keyframes', 'import', 'important',
  ]),
  text: new Set(),
};

export function tokenizeLine(line: string, language: SupportedLanguage): SyntaxToken[] {
  if (!line) return [{ type: 'plain', value: '' }];

  const tokens: SyntaxToken[] = [];
  const keywords = KEYWORDS[language];
  let i = 0;
  const len = line.length;

  const pushToken = (type: TokenType, value: string) => {
    if (!value) return;
    const prev = tokens[tokens.length - 1];
    if (prev && prev.type === type) {
      prev.value += value;
    } else {
      tokens.push({ type, value });
    }
  };

  while (i < len) {
    // Line comments
    if (
      (language === 'javascript' || language === 'cpp' || language === 'java') &&
      line.slice(i, i + 2) === '//'
    ) {
      pushToken('comment', line.slice(i));
      break;
    }
    if (language === 'python' && line[i] === '#') {
      pushToken('comment', line.slice(i));
      break;
    }
    if (language === 'cpp' && line[i] === '#' && line.slice(0, i).trim() === '') {
      const match = line.slice(i).match(/^#\w+/);
      if (match) {
        pushToken('keyword', match[0]);
        i += match[0].length;
        continue;
      }
    }
    if (
      (language === 'css' || language === 'javascript' || language === 'cpp' || language === 'java') &&
      line.slice(i, i + 2) === '/*'
    ) {
      const end = line.indexOf('*/', i + 2);
      if (end !== -1) {
        pushToken('comment', line.slice(i, end + 2));
        i = end + 2;
      } else {
        pushToken('comment', line.slice(i));
        break;
      }
      continue;
    }
    if (language === 'html' && line.slice(i, i + 4) === '<!--') {
      const end = line.indexOf('-->', i + 4);
      if (end !== -1) {
        pushToken('comment', line.slice(i, end + 3));
        i = end + 3;
      } else {
        pushToken('comment', line.slice(i));
        break;
      }
      continue;
    }

    // Strings
    if (line[i] === '"' || line[i] === "'" || (language === 'javascript' && line[i] === '`')) {
      const quote = line[i];
      let j = i + 1;
      while (j < len && line[j] !== quote) {
        if (line[j] === '\\' && j + 1 < len) j += 2;
        else j++;
      }
      const endIdx = j < len ? j + 1 : len;
      pushToken('string', line.slice(i, endIdx));
      i = endIdx;
      continue;
    }

    // CSS hex colors or numbers
    if (language === 'css' && line[i] === '#') {
      const hex = line.slice(i).match(/^#[0-9a-fA-F]{3,8}/);
      if (hex) {
        pushToken('number', hex[0]);
        i += hex[0].length;
        continue;
      }
    }

    // Numbers
    if (/[0-9]/.test(line[i]) && (i === 0 || !/[a-zA-Z0-9_]/.test(line[i - 1]))) {
      const num = line.slice(i).match(/^(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?(?:px|rem|em|%|ms|s)?)/);
      if (num) {
        pushToken('number', num[0]);
        i += num[0].length;
        continue;
      }
    }

    // HTML tag names
    if (language === 'html' && (line[i] === '<' || line[i] === '>')) {
      const tagMatch = line.slice(i).match(/^<\/?([a-zA-Z0-9!-]+)/);
      if (tagMatch) {
        pushToken('plain', tagMatch[0].startsWith('</') ? '</' : '<');
        pushToken('keyword', tagMatch[1]);
        i += tagMatch[0].length;
        continue;
      }
      pushToken('plain', line[i]);
      i++;
      continue;
    }

    // Identifiers, keywords, functions
    if (/[a-zA-Z_$]/.test(line[i])) {
      const wordMatch = line.slice(i).match(/^[a-zA-Z0-9_$-]+/);
      if (wordMatch) {
        const word = wordMatch[0];
        const nextChar = line[i + word.length];
        if (keywords.has(word)) {
          pushToken('keyword', word);
        } else if (nextChar === '(') {
          pushToken('function', word);
        } else if (language === 'html' && nextChar === '=') {
          pushToken('function', word);
        } else if (language === 'css' && (line[i - 1] === '.' || line[i - 1] === ':')) {
          pushToken('function', word);
        } else if (/^[A-Z][A-Z0-9_]{2,}$/.test(word)) {
          pushToken('number', word);
        } else {
          pushToken('plain', word);
        }
        i += word.length;
        continue;
      }
    }

    pushToken('plain', line[i]);
    i++;
  }

  return tokens;
}

export function tokenizeCode(code: string, language: SupportedLanguage): SyntaxToken[][] {
  return code.split('\n').map((line) => tokenizeLine(line, language));
}
