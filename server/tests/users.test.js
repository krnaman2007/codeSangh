import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  updateMeSchema,
  changePasswordSchema,
  searchUsersSchema,
} from '../src/validators/user.schema.js';

describe('Users Module Validation & Business Rules (Endpoints 8-10)', () => {

  // Endpoint #8: PATCH /users/me
  describe('Endpoint #8: updateMeSchema (Blueprint 7.4 & 13.1)', () => {
    it('should accept valid profile updates with name, avatarColor, and preferences', async () => {
      const validData = {
        body: {
          name: 'Naman Kumar',
          avatarColor: '#EC4899',
          preferences: {
            aiSuggestions: false,
            suggestionDelayMs: 600,
          },
        },
      };

      const result = await updateMeSchema.parseAsync(validData);
      assert.strictEqual(result.body.name, 'Naman Kumar');
      assert.strictEqual(result.body.avatarColor, '#EC4899');
      assert.strictEqual(result.body.preferences.aiSuggestions, false);
      assert.strictEqual(result.body.preferences.suggestionDelayMs, 600);
    });

    it('should accept partial profile update with only name', async () => {
      const validData = {
        body: {
          name: 'Riya Sharma',
        },
      };

      const result = await updateMeSchema.parseAsync(validData);
      assert.strictEqual(result.body.name, 'Riya Sharma');
    });

    it('should reject invalid avatarColor format (must be 6-char hex)', async () => {
      const invalidData = {
        body: {
          avatarColor: 'red', // Not a hex color
        },
      };

      await assert.rejects(async () => {
        await updateMeSchema.parseAsync(invalidData);
      });
    });

    it('should reject suggestionDelayMs outside 200-2000 range', async () => {
      const invalidLow = {
        body: {
          preferences: {
            suggestionDelayMs: 50, // Less than 200
          },
        },
      };

      await assert.rejects(async () => {
        await updateMeSchema.parseAsync(invalidLow);
      });

      const invalidHigh = {
        body: {
          preferences: {
            suggestionDelayMs: 5000, // Greater than 2000
          },
        },
      };

      await assert.rejects(async () => {
        await updateMeSchema.parseAsync(invalidHigh);
      });
    });

    it('should reject empty body', async () => {
      const emptyData = {
        body: {},
      };

      await assert.rejects(async () => {
        await updateMeSchema.parseAsync(emptyData);
      });
    });
  });

  // Endpoint #9: PATCH /users/me/password
  describe('Endpoint #9: changePasswordSchema (Blueprint 7.4 & 13.1)', () => {
    it('should accept valid current and new password', async () => {
      const validData = {
        body: {
          currentPassword: 'OldPassword1',
          newPassword: 'NewSecurePassword2',
        },
      };

      const result = await changePasswordSchema.parseAsync(validData);
      assert.strictEqual(result.body.currentPassword, 'OldPassword1');
      assert.strictEqual(result.body.newPassword, 'NewSecurePassword2');
    });

    it('should reject new password without numbers', async () => {
      const invalidData = {
        body: {
          currentPassword: 'OldPassword1',
          newPassword: 'NoNumbersInThisPassword',
        },
      };

      await assert.rejects(async () => {
        await changePasswordSchema.parseAsync(invalidData);
      });
    });

    it('should reject new password shorter than 8 characters', async () => {
      const invalidData = {
        body: {
          currentPassword: 'OldPassword1',
          newPassword: 'Short1',
        },
      };

      await assert.rejects(async () => {
        await changePasswordSchema.parseAsync(invalidData);
      });
    });
  });

  // Endpoint #10: GET /users/search
  describe('Endpoint #10: searchUsersSchema (Blueprint 7.4)', () => {
    it('should accept valid search query (q >= 3 chars, valid projectId UUID)', async () => {
      const validQuery = {
        query: {
          q: 'riy',
          projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01',
        },
      };

      const result = await searchUsersSchema.parseAsync(validQuery);
      assert.strictEqual(result.query.q, 'riy');
      assert.strictEqual(result.query.projectId, '3f2a9c1e-6140-4c12-8809-5b76612c2a01');
    });

    it('should reject search query shorter than 3 characters (min 3 chars required)', async () => {
      const invalidQuery = {
        query: {
          q: 'ri', // Only 2 chars
          projectId: '3f2a9c1e-0000-0000-0000-000000000001',
        },
      };

      await assert.rejects(async () => {
        await searchUsersSchema.parseAsync(invalidQuery);
      });
    });

    it('should reject invalid UUID for projectId', async () => {
      const invalidQuery = {
        query: {
          q: 'riya',
          projectId: 'not-a-valid-uuid',
        },
      };

      await assert.rejects(async () => {
        await searchUsersSchema.parseAsync(invalidQuery);
      });
    });
  });
});
