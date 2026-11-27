import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateNodeName } from '../src/utils/nameRules.js';
import { getTreeSchema, createFolderSchema } from '../src/validators/node.schema.js';
import { LIMITS } from '../src/constants/limits.js';

describe('Nodes Module Validation & Business Rules (Endpoints 16-17)', () => {

  // Name Validation Rules (Blueprint Section 13.1)
  describe('Name Validation Rules (Blueprint 13.1)', () => {
    it('should accept valid folder and file names', () => {
      const validNames = ['src', 'components', 'utils_v2', 'MyFolder', 'test-data', 'app.js'];
      for (const name of validNames) {
        const res = validateNodeName(name);
        assert.strictEqual(res.valid, true, `Expected "${name}" to be valid`);
      }
    });

    it("should reject '.' and '..' (reserved paths)", () => {
      assert.strictEqual(validateNodeName('.').valid, false);
      assert.strictEqual(validateNodeName('..').valid, false);
    });

    it('should reject names with forbidden characters: / \\ : * ? " < > |', () => {
      const forbidden = ['folder/child', 'win\\dir', 'file:name', 'star*file', 'what?file', 'quote"name', 'tag<file', 'tag>file', 'pipe|file'];
      for (const name of forbidden) {
        const res = validateNodeName(name);
        assert.strictEqual(res.valid, false, `Expected "${name}" with forbidden char to be rejected`);
      }
    });

    it('should reject empty names or names exceeding 100 characters', () => {
      assert.strictEqual(validateNodeName('').valid, false);
      assert.strictEqual(validateNodeName('   ').valid, false);
      assert.strictEqual(validateNodeName('a'.repeat(101)).valid, false);
      assert.strictEqual(validateNodeName('a'.repeat(100)).valid, true);
    });
  });

  // Endpoint #16: GET /projects/:projectId/tree
  describe('Endpoint #16: getTreeSchema (Blueprint 7.5)', () => {
    it('should accept valid UUID for projectId', async () => {
      const validParams = {
        params: {
          projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01',
        },
      };

      const result = await getTreeSchema.parseAsync(validParams);
      assert.strictEqual(result.params.projectId, '3f2a9c1e-6140-4c12-8809-5b76612c2a01');
    });

    it('should reject invalid UUID format for projectId', async () => {
      const invalidParams = {
        params: {
          projectId: 'not-a-valid-uuid',
        },
      };

      await assert.rejects(async () => {
        await getTreeSchema.parseAsync(invalidParams);
      });
    });
  });

  // Endpoint #17: POST /projects/:projectId/folders
  describe('Endpoint #17: createFolderSchema (Blueprint 7.5)', () => {
    it('should accept root-level folder creation (parentId is null or omitted)', async () => {
      const validData1 = {
        params: { projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01' },
        body: { name: 'src', parentId: null },
      };
      const result1 = await createFolderSchema.parseAsync(validData1);
      assert.strictEqual(result1.body.name, 'src');
      assert.strictEqual(result1.body.parentId, null);

      const validData2 = {
        params: { projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01' },
        body: { name: 'components' },
      };
      const result2 = await createFolderSchema.parseAsync(validData2);
      assert.strictEqual(result2.body.name, 'components');
    });

    it('should accept nested folder creation with valid parentId UUID', async () => {
      const validData = {
        params: { projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01' },
        body: {
          name: 'buttons',
          parentId: '11111111-2222-4333-8444-555555555555',
        },
      };

      const result = await createFolderSchema.parseAsync(validData);
      assert.strictEqual(result.body.name, 'buttons');
      assert.strictEqual(result.body.parentId, '11111111-2222-4333-8444-555555555555');
    });

    it('should reject folder name with forbidden characters', async () => {
      const invalidData = {
        params: { projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01' },
        body: { name: 'invalid/name' },
      };

      await assert.rejects(async () => {
        await createFolderSchema.parseAsync(invalidData);
      });
    });

    it('should reject invalid UUID for parentId', async () => {
      const invalidData = {
        params: { projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01' },
        body: {
          name: 'subfolder',
          parentId: 'non-uuid-parent-id',
        },
      };

      await assert.rejects(async () => {
        await createFolderSchema.parseAsync(invalidData);
      });
    });
  });

  // Limit constants checks
  describe('Limits Verification (Blueprint 4.3)', () => {
    it('nodes per project limit is 500', () => {
      assert.strictEqual(LIMITS.NODES_PER_PROJECT, 500);
    });

    it('folder nesting depth limit is 8', () => {
      assert.strictEqual(LIMITS.FOLDER_NESTING_DEPTH, 8);
    });
  });
});
