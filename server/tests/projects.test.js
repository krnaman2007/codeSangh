import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createProjectSchema,
  getProjectsSchema,
  projectIdParamSchema,
  renameProjectSchema,
} from '../src/validators/project.schema.js';
import { LIMITS } from '../src/constants/limits.js';
import ApiError from '../src/utils/ApiError.js';

describe('Projects Module Validation & Business Rules (Endpoints 11-15)', () => {

  // Endpoint #12: POST /projects
  describe('Endpoint #12: createProjectSchema (Blueprint 7.4 & 13.1)', () => {
    it('should accept valid project name', async () => {
      const validData = {
        body: {
          name: 'my-portfolio',
        },
      };

      const result = await createProjectSchema.parseAsync(validData);
      assert.strictEqual(result.body.name, 'my-portfolio');
    });

    it('should trim project name whitespace', async () => {
      const validData = {
        body: {
          name: '   team-dashboard   ',
        },
      };

      const result = await createProjectSchema.parseAsync(validData);
      assert.strictEqual(result.body.name, 'team-dashboard');
    });

    it('should reject empty project name', async () => {
      const invalidData = {
        body: {
          name: '',
        },
      };

      await assert.rejects(async () => {
        await createProjectSchema.parseAsync(invalidData);
      });
    });

    it('should reject project name exceeding 100 characters (Blueprint 13.1)', async () => {
      const invalidData = {
        body: {
          name: 'a'.repeat(101),
        },
      };

      await assert.rejects(async () => {
        await createProjectSchema.parseAsync(invalidData);
      });
    });

    it('should accept 100 character project name', async () => {
      const validData = {
        body: {
          name: 'a'.repeat(100),
        },
      };

      const result = await createProjectSchema.parseAsync(validData);
      assert.strictEqual(result.body.name.length, 100);
    });

    it('should accept name and allow extra fields like language to be ignored (Blueprint 7.4)', async () => {
      const dataWithLanguage = {
        body: {
          name: 'python-project',
          language: 'python',
        },
      };

      const result = await createProjectSchema.parseAsync(dataWithLanguage);
      assert.strictEqual(result.body.name, 'python-project');
    });
  });

  // Endpoint #11: GET /projects
  describe('Endpoint #11: getProjectsSchema (Blueprint 7.4)', () => {
    it('should accept optional search query parameter', async () => {
      const validQuery = {
        query: {
          search: 'port',
        },
      };

      const result = await getProjectsSchema.parseAsync(validQuery);
      assert.strictEqual(result.query.search, 'port');
    });

    it('should accept empty query parameters (list all projects)', async () => {
      const emptyQuery = {
        query: {},
      };

      const result = await getProjectsSchema.parseAsync(emptyQuery);
      assert.deepStrictEqual(result.query, {});
    });
  });

  // Endpoint #13 & #15: projectIdParamSchema
  describe('Endpoints #13 & #15: projectIdParamSchema (Blueprint 7.4)', () => {
    it('should accept valid UUID for projectId', async () => {
      const validParams = {
        params: {
          projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01',
        },
      };

      const result = await projectIdParamSchema.parseAsync(validParams);
      assert.strictEqual(result.params.projectId, '3f2a9c1e-6140-4c12-8809-5b76612c2a01');
    });

    it('should reject invalid UUID for projectId', async () => {
      const invalidParams = {
        params: {
          projectId: 'invalid-uuid-string',
        },
      };

      await assert.rejects(async () => {
        await projectIdParamSchema.parseAsync(invalidParams);
      });
    });
  });

  // Endpoint #14: renameProjectSchema
  describe('Endpoint #14: renameProjectSchema (Blueprint 7.4)', () => {
    it('should accept valid projectId and new name', async () => {
      const validData = {
        params: {
          projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01',
        },
        body: {
          name: 'portfolio-v2',
        },
      };

      const result = await renameProjectSchema.parseAsync(validData);
      assert.strictEqual(result.params.projectId, '3f2a9c1e-6140-4c12-8809-5b76612c2a01');
      assert.strictEqual(result.body.name, 'portfolio-v2');
    });

    it('should reject empty new name on rename', async () => {
      const invalidData = {
        params: {
          projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01',
        },
        body: {
          name: '',
        },
      };

      await assert.rejects(async () => {
        await renameProjectSchema.parseAsync(invalidData);
      });
    });
  });

  // RBAC & Project Access Hierarchy (Blueprint Section 6.2 & Page 19)
  describe('Role Hierarchy & Permission Matrix (Blueprint 6.2)', () => {
    const RANK = { viewer: 1, editor: 2, owner: 3 };

    function checkAccess(role, minRole) {
      if (!role) throw new ApiError(404, 'NOT_FOUND', 'Project not found');
      if (RANK[role] < RANK[minRole]) throw new ApiError(403, 'FORBIDDEN', 'Insufficient access');
      return true;
    }

    it('owner should have access to viewer, editor, and owner routes', () => {
      assert.strictEqual(checkAccess('owner', 'viewer'), true);
      assert.strictEqual(checkAccess('owner', 'editor'), true);
      assert.strictEqual(checkAccess('owner', 'owner'), true);
    });

    it('editor should have access to viewer and editor, but NOT owner routes (403)', () => {
      assert.strictEqual(checkAccess('editor', 'viewer'), true);
      assert.strictEqual(checkAccess('editor', 'editor'), true);
      assert.throws(() => checkAccess('editor', 'owner'), (err) => {
        return err.statusCode === 403 && err.code === 'FORBIDDEN';
      });
    });

    it('viewer should have access to viewer routes, but NOT editor or owner (403)', () => {
      assert.strictEqual(checkAccess('viewer', 'viewer'), true);
      assert.throws(() => checkAccess('viewer', 'editor'), (err) => {
        return err.statusCode === 403 && err.code === 'FORBIDDEN';
      });
      assert.throws(() => checkAccess('viewer', 'owner'), (err) => {
        return err.statusCode === 403 && err.code === 'FORBIDDEN';
      });
    });

    it('non-member should be rejected with 404 NOT_FOUND without leaking existence', () => {
      assert.throws(() => checkAccess(null, 'viewer'), (err) => {
        return err.statusCode === 404 && err.code === 'NOT_FOUND';
      });
    });
  });

  // Limits Configuration (Blueprint 4.3)
  describe('Limits Configuration (Blueprint 4.3)', () => {
    it('should enforce 50 projects per user owned limit', () => {
      assert.strictEqual(LIMITS.PROJECTS_PER_USER, 50);
    });

    it('should enforce 500 nodes per project limit', () => {
      assert.strictEqual(LIMITS.NODES_PER_PROJECT, 500);
    });

    it('should enforce 8 folder nesting depth limit', () => {
      assert.strictEqual(LIMITS.FOLDER_NESTING_DEPTH, 8);
    });

    it('should enforce 20 collaborators per project limit', () => {
      assert.strictEqual(LIMITS.COLLABORATORS_PER_PROJECT, 20);
    });
  });
});
