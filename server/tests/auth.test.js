import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { registerSchema, loginSchema, refreshSchema } from '../src/validators/auth.schema.js';
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiresAt,
} from '../src/services/token.service.js';
import { authenticate } from '../src/middleware/auth.js';
import { validate } from '../src/middleware/validate.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { getRandomColor, AVATAR_PALETTE } from '../src/utils/colors.js';
import { sendSuccess } from '../src/utils/respond.js';
import ApiError from '../src/utils/ApiError.js';
import jwt from 'jsonwebtoken';
import env from '../src/config/env.js';

describe('Auth & Health System Tests', () => {

  // 1. Health Response Helper Test
  it('sendSuccess should format standard success envelope (Blueprint 7.1)', () => {
    let responseData = null;
    let statusCode = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
          },
        };
      },
    };

    sendSuccess(res, { status: 'ok' }, 200);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.data.status, 'ok');
  });

  // 2. Avatar Color Palette Test
  it('getRandomColor should return a valid color from the palette', () => {
    const color = getRandomColor();
    assert.match(color, /^#[0-9A-Fa-f]{6}$/);
    assert.strictEqual(AVATAR_PALETTE.includes(color), true);
  });

  // 3. Register Schema Validation Tests
  describe('Register Schema (Blueprint 13.1)', () => {
    it('should accept valid registration input', async () => {
      const validData = {
        body: {
          name: 'Naman Kumar',
          email: 'NAMAN@Example.COM',
          password: 'Password123',
        },
      };
      const result = await registerSchema.parseAsync(validData);
      assert.strictEqual(result.body.name, 'Naman Kumar');
      assert.strictEqual(result.body.email, 'naman@example.com'); // lower-cased automatically
    });

    it('should reject invalid email', async () => {
      const invalidData = {
        body: {
          name: 'Naman',
          email: 'not-an-email',
          password: 'Password123',
        },
      };
      await assert.rejects(async () => {
        await registerSchema.parseAsync(invalidData);
      });
    });

    it('should reject password without numbers (min 8 chars, 1 letter, 1 number)', async () => {
      const invalidData = {
        body: {
          name: 'Naman',
          email: 'test@example.com',
          password: 'onlyletters',
        },
      };
      await assert.rejects(async () => {
        await registerSchema.parseAsync(invalidData);
      });
    });

    it('should reject name shorter than 2 chars', async () => {
      const invalidData = {
        body: {
          name: 'N',
          email: 'test@example.com',
          password: 'Password123',
        },
      };
      await assert.rejects(async () => {
        await registerSchema.parseAsync(invalidData);
      });
    });
  });

  // 4. Login Schema Validation Tests
  describe('Login Schema', () => {
    it('should accept valid login input', async () => {
      const validData = {
        body: {
          email: 'USER@DOMAIN.COM',
          password: 'anyPassword',
        },
      };
      const result = await loginSchema.parseAsync(validData);
      assert.strictEqual(result.body.email, 'user@domain.com');
    });

    it('should reject empty password', async () => {
      const invalidData = {
        body: {
          email: 'user@domain.com',
          password: '',
        },
      };
      await assert.rejects(async () => {
        await loginSchema.parseAsync(invalidData);
      });
    });
  });

  // 5. Token Service Tests (Blueprint 6.1)
  describe('Token Service', () => {
    const mockUser = { id: '3f2a9c1e-0000-0000-0000-000000000001', name: 'Naman K' };

    it('generateAccessToken should create a valid JWT with sub and name', () => {
      const token = generateAccessToken(mockUser);
      assert.ok(typeof token === 'string' && token.length > 20);

      const payload = verifyAccessToken(token);
      assert.strictEqual(payload.sub, mockUser.id);
      assert.strictEqual(payload.name, mockUser.name);
    });

    it('generateRefreshToken should return a 64-byte hex string (128 chars)', () => {
      const token = generateRefreshToken();
      assert.strictEqual(token.length, 128);
    });

    it('hashToken should return a 64-char SHA-256 hex string', () => {
      const token = 'sample-refresh-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      assert.strictEqual(hash1.length, 64);
      assert.strictEqual(hash1, hash2); // Deterministic
    });

    it('getRefreshTokenExpiresAt should be ~7 days in the future', () => {
      const expiresAt = getRefreshTokenExpiresAt();
      const diffDays = (expiresAt - new Date()) / (1000 * 60 * 60 * 24);
      assert.ok(diffDays >= 6.9 && diffDays <= 7.1);
    });
  });

  // 6. Auth Middleware Tests (Blueprint 6.1 & 7.13)
  describe('Auth Middleware', () => {
    it('should reject requests without Authorization header with 401 AUTH_REQUIRED', () => {
      const req = { headers: {} };
      let passedError = null;
      authenticate(req, {}, (err) => {
        passedError = err;
      });

      assert.ok(passedError instanceof ApiError);
      assert.strictEqual(passedError.statusCode, 401);
      assert.strictEqual(passedError.code, 'AUTH_REQUIRED');
    });

    it('should reject invalid token with 401 AUTH_REQUIRED', () => {
      const req = { headers: { authorization: 'Bearer invalid.fake.token' } };
      let passedError = null;
      authenticate(req, {}, (err) => {
        passedError = err;
      });

      assert.ok(passedError instanceof ApiError);
      assert.strictEqual(passedError.statusCode, 401);
      assert.strictEqual(passedError.code, 'AUTH_REQUIRED');
    });

    it('should reject expired token with 401 TOKEN_EXPIRED', () => {
      const expiredToken = jwt.sign({ sub: 'user-id', name: 'User' }, env.JWT_ACCESS_SECRET, {
        expiresIn: '-1s',
      });
      const req = { headers: { authorization: `Bearer ${expiredToken}` } };
      let passedError = null;
      authenticate(req, {}, (err) => {
        passedError = err;
      });

      assert.ok(passedError instanceof ApiError);
      assert.strictEqual(passedError.statusCode, 401);
      assert.strictEqual(passedError.code, 'TOKEN_EXPIRED');
    });

    it('should authenticate valid token and attach user to req', () => {
      const validToken = generateAccessToken({ id: 'u123', name: 'Test User' });
      const req = { headers: { authorization: `Bearer ${validToken}` } };
      let calledNext = false;
      authenticate(req, {}, (err) => {
        if (!err) calledNext = true;
      });

      assert.strictEqual(calledNext, true);
      assert.strictEqual(req.user.id, 'u123');
      assert.strictEqual(req.user.name, 'Test User');
    });
  });

  // 7. Error Handler Tests (Blueprint Error Mapping)
  describe('Error Handler Middleware', () => {
    it('should map Prisma P2002 on email to 409 EMAIL_TAKEN', () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
      };

      let jsonOutput = null;
      let statusCode = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              jsonOutput = data;
            },
          };
        },
      };

      errorHandler(prismaError, {}, res, () => {});
      assert.strictEqual(statusCode, 409);
      assert.strictEqual(jsonOutput.success, false);
      assert.strictEqual(jsonOutput.error.code, 'EMAIL_TAKEN');
    });
  });
});
