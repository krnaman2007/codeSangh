import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createProjectSchema,
  getProjectsSchema,
} from '../src/validators/project.schema.js';
import { LIMITS } from '../src/constants/limits.js';

describe('Projects Module Validation & Business Rules (Endpoints 11-12)', () => {

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
          language: 'python', // Should be ignored as per Blueprint rule: "language field is rejected/ignored"
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

  // Limits Verification (Blueprint 4.3)
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
