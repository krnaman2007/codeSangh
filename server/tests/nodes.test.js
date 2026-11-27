import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { validateNodeName } from '../src/utils/nameRules.js';
import {
  getTreeSchema,
  createFolderSchema,
  createFileSchema,
  fileIdParamSchema,
  updateContentSchema,
  renameNodeSchema,
  moveNodeSchema,
  changeLanguageSchema,
  nodeIdParamSchema,
} from '../src/validators/node.schema.js';
import { isDescendant, computeNodePath } from '../src/utils/treeUtils.js';
import { getLanguageByKey, isValidLanguageKey } from '../src/constants/languages.js';
import { LIMITS } from '../src/constants/limits.js';

describe('Nodes Module Validation & Business Rules (Endpoints 16-24)', () => {

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
  });

  // Endpoint #18: POST /projects/:projectId/files
  describe('Endpoint #18: createFileSchema & Extension Rules (Blueprint 7.5)', () => {
    it('should accept valid file creation with name and language', async () => {
      const validData = {
        params: { projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01' },
        body: {
          name: 'helper.py',
          language: 'python',
          parentId: null,
          content: 'print("hello")',
        },
      };

      const result = await createFileSchema.parseAsync(validData);
      assert.strictEqual(result.body.name, 'helper.py');
      assert.strictEqual(result.body.language, 'python');
      assert.strictEqual(result.body.content, 'print("hello")');
    });

    it('extension rule: should append default extension if none provided', () => {
      const name = 'helper';
      const language = 'python';
      const langConfig = getLanguageByKey(language);
      assert.strictEqual(isValidLanguageKey(language), true);

      let finalName = name;
      if (!path.extname(name) && langConfig.ext) {
        finalName = `${name}${langConfig.ext}`;
      }
      assert.strictEqual(finalName, 'helper.py');
    });

    it('should reject file creation without language (422)', async () => {
      const invalidData = {
        params: { projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01' },
        body: {
          name: 'main.js',
          // language missing
        },
      };

      await assert.rejects(async () => {
        await createFileSchema.parseAsync(invalidData);
      });
    });
  });

  // Endpoint #19 & #20: File ID and Content Updates
  describe('Endpoint #20: updateContentSchema (Blueprint 7.5 & 13.1)', () => {
    it('should accept valid content update', async () => {
      const validData = {
        params: {
          projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01',
          fileId: '22222222-3333-4444-8555-666666666666',
        },
        body: {
          content: "console.log('updated content');\n",
        },
      };

      const result = await updateContentSchema.parseAsync(validData);
      assert.strictEqual(result.body.content, "console.log('updated content');\n");
    });

    it('should reject content exceeding 1 MB (LIMITS.FILE_CONTENT_MAX_BYTES)', async () => {
      const oversizedContent = 'a'.repeat(LIMITS.FILE_CONTENT_MAX_BYTES + 1);
      const invalidData = {
        params: {
          projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01',
          fileId: '22222222-3333-4444-8555-666666666666',
        },
        body: {
          content: oversizedContent,
        },
      };

      await assert.rejects(async () => {
        await updateContentSchema.parseAsync(invalidData);
      });
    });
  });

  // Endpoint #21: Rename Node
  describe('Endpoint #21: renameNodeSchema (Blueprint 7.5)', () => {
    it('should accept valid rename name', async () => {
      const validData = {
        params: {
          projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01',
          nodeId: '22222222-3333-4444-8555-666666666666',
        },
        body: {
          name: 'renamed-file.js',
        },
      };

      const result = await renameNodeSchema.parseAsync(validData);
      assert.strictEqual(result.body.name, 'renamed-file.js');
    });

    it('should reject rename with empty string or forbidden chars', async () => {
      const invalidData = {
        params: {
          projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01',
          nodeId: '22222222-3333-4444-8555-666666666666',
        },
        body: {
          name: 'bad/name.js',
        },
      };

      await assert.rejects(async () => {
        await renameNodeSchema.parseAsync(invalidData);
      });
    });
  });

  // Endpoint #22: Move Node & Hierarchy Guard
  describe('Endpoint #22: moveNodeSchema & Hierarchy Safety (Blueprint 7.5)', () => {
    it('should accept valid parentId or null for root move', async () => {
      const validMoveToRoot = {
        params: {
          projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01',
          nodeId: '22222222-3333-4444-8555-666666666666',
        },
        body: {
          parentId: null,
        },
      };
      const result = await moveNodeSchema.parseAsync(validMoveToRoot);
      assert.strictEqual(result.body.parentId, null);
    });

    it('isDescendant helper should detect moving into self or descendants', async () => {
      // Mock hierarchy: rootFolder (f1) -> subFolder (f2) -> deepFolder (f3)
      const mockNodes = {
        f1: { id: 'f1', parentId: null },
        f2: { id: 'f2', parentId: 'f1' },
        f3: { id: 'f3', parentId: 'f2' },
        f4: { id: 'f4', parentId: null }, // Unrelated folder
      };

      const getParent = async (id) => mockNodes[id] || null;

      // Moving f1 into f1 (self)
      assert.strictEqual(await isDescendant('f1', 'f1', getParent), true);

      // Moving f1 into f2 (child)
      assert.strictEqual(await isDescendant('f2', 'f1', getParent), true);

      // Moving f1 into f3 (grandchild)
      assert.strictEqual(await isDescendant('f3', 'f1', getParent), true);

      // Moving f1 into f4 (unrelated) -> NOT descendant
      assert.strictEqual(await isDescendant('f4', 'f1', getParent), false);
    });
  });

  // Path Computation Utility (Endpoint #19)
  describe('Path Computation (Blueprint 7.5)', () => {
    it('computeNodePath should generate correct forward-slash path', async () => {
      const mockNodes = {
        n1: { id: 'n1', name: 'src', parentId: null },
        n2: { id: 'n2', name: 'components', parentId: 'n1' },
        n3: { id: 'n3', name: 'Button.jsx', parentId: 'n2' },
      };

      const getParent = async (id) => mockNodes[id] || null;

      const path1 = await computeNodePath(mockNodes.n1, getParent);
      assert.strictEqual(path1, '/src');

      const path3 = await computeNodePath(mockNodes.n3, getParent);
      assert.strictEqual(path3, '/src/components/Button.jsx');
    });
  });

  // Endpoint #23: Change Language
  describe('Endpoint #23: changeLanguageSchema (Blueprint 7.5)', () => {
    it('should accept valid supported language', async () => {
      const validData = {
        params: {
          projectId: '3f2a9c1e-6140-4c12-8809-5b76612c2a01',
          fileId: '22222222-3333-4444-8555-666666666666',
        },
        body: {
          language: 'python',
        },
      };

      const result = await changeLanguageSchema.parseAsync(validData);
      assert.strictEqual(result.body.language, 'python');
      assert.strictEqual(isValidLanguageKey('python'), true);
    });
  });
});
