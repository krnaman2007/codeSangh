import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  LANGUAGES,
  LANGUAGE_KEYS,
  RUNNABLE_LANGUAGES,
  getLanguageByKey,
  getLanguageByExt,
  isValidLanguageKey,
} from '../src/constants/languages.js';
import { getLanguages } from '../src/controllers/language.controller.js';

describe('Endpoint #2: Languages Registry (Blueprint Section 4.2 & 7.3)', () => {

  it('should contain all required languages from the Blueprint', () => {
    const requiredKeys = ['javascript', 'python', 'java', 'cpp', 'html', 'css', 'text'];
    for (const key of requiredKeys) {
      assert.ok(LANGUAGE_KEYS.includes(key), `Missing required language key: ${key}`);
    }
    assert.strictEqual(LANGUAGES.length >= 7, true);
  });

  it('each language entry should conform to the Blueprint registry shape', () => {
    for (const lang of LANGUAGES) {
      assert.ok(lang.key, 'Language must have key');
      assert.ok(lang.label, 'Language must have label');
      assert.ok(lang.ext.startsWith('.'), 'Language ext must start with dot');
      assert.ok(lang.monaco, 'Language must have monaco id');
      assert.ok(['run', 'preview', 'none'].includes(lang.mode), `Invalid mode: ${lang.mode}`);
      assert.strictEqual(typeof lang.debug, 'boolean');
    }
  });

  it('runnable languages should include javascript, python, java, and cpp', () => {
    assert.ok(RUNNABLE_LANGUAGES.includes('javascript'));
    assert.ok(RUNNABLE_LANGUAGES.includes('python'));
    assert.ok(RUNNABLE_LANGUAGES.includes('java'));
    assert.ok(RUNNABLE_LANGUAGES.includes('cpp'));
    assert.strictEqual(RUNNABLE_LANGUAGES.includes('html'), false);
    assert.strictEqual(RUNNABLE_LANGUAGES.includes('css'), false);
  });

  it('getLanguageByKey helper should return correct config', () => {
    const py = getLanguageByKey('python');
    assert.ok(py);
    assert.strictEqual(py.label, 'Python');
    assert.strictEqual(py.ext, '.py');
    assert.strictEqual(py.judge0Id, 71);
    assert.strictEqual(py.debugAdapter, 'debugpy');
    assert.strictEqual(py.envRuntime, 'python');

    assert.strictEqual(getLanguageByKey('unknown_lang'), null);
  });

  it('getLanguageByExt helper should return correct config', () => {
    const js = getLanguageByExt('.js');
    assert.ok(js);
    assert.strictEqual(js.key, 'javascript');

    const cpp = getLanguageByExt('.cpp');
    assert.ok(cpp);
    assert.strictEqual(cpp.key, 'cpp');

    assert.strictEqual(getLanguageByExt('.xyz'), null);
  });

  it('isValidLanguageKey helper should validate registry keys', () => {
    assert.strictEqual(isValidLanguageKey('javascript'), true);
    assert.strictEqual(isValidLanguageKey('nonexistent'), false);
  });

  it('getLanguages controller should return standard response envelope with languages array', () => {
    let capturedData = null;
    let statusCode = null;

    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            capturedData = data;
          },
        };
      },
    };

    getLanguages({}, res);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(capturedData.success, true);
    assert.ok(Array.isArray(capturedData.data.languages));
    assert.strictEqual(capturedData.data.languages.length, LANGUAGES.length);
  });
});
