import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFirstCodeBlock } from './aiMarkdown';

test('extractFirstCodeBlock returns code content from fenced markdown', () => {
  const sample = 'Here is a fix:\n```python\ndef add(a, b):\n    return a + b\n```\nDone.';
  assert.equal(extractFirstCodeBlock(sample), 'def add(a, b):\n    return a + b');
  assert.equal(extractFirstCodeBlock('No code block here'), null);
});
