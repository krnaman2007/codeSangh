import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClientError, normalizeApiErrorPayload } from './errors';
import { sanitizeReturnUrl } from '../state/authStore';

test('normalizeApiErrorPayload maps validation details and known error codes', () => {
  const validationErr = normalizeApiErrorPayload(422, {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [
        { field: 'email', message: 'Invalid email address' },
        { field: 'password', message: 'Password must be at least 8 characters long' },
      ],
    },
  });

  assert.ok(validationErr instanceof ApiClientError);
  assert.equal(validationErr.status, 422);
  assert.equal(validationErr.code, 'VALIDATION_ERROR');
  assert.equal(validationErr.fieldErrors.email, 'Invalid email address');
  assert.equal(
    validationErr.fieldErrors.password,
    'Password must be at least 8 characters long'
  );

  const authErr = normalizeApiErrorPayload(401, null);
  assert.equal(authErr.code, 'AUTH_REQUIRED');
  assert.equal(authErr.isAuthError, true);

  const forbiddenErr = normalizeApiErrorPayload(403, {
    success: false,
    error: { code: 'FORBIDDEN', message: 'Read-only access' },
  });
  assert.equal(forbiddenErr.isForbidden, true);
});

test('sanitizeReturnUrl blocks open redirects and auth loops', () => {
  assert.equal(sanitizeReturnUrl('/project/abc-123'), '/project/abc-123');
  assert.equal(sanitizeReturnUrl('https://evil.example'), '/dashboard');
  assert.equal(sanitizeReturnUrl('//evil.example'), '/dashboard');
  assert.equal(sanitizeReturnUrl('/login'), '/dashboard');
  assert.equal(sanitizeReturnUrl('/register'), '/dashboard');
  assert.equal(sanitizeReturnUrl(null), '/dashboard');
});
