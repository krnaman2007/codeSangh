import test from 'node:test';
import assert from 'node:assert/strict';
import { getPermissionsForRole } from './permissions';
import {
  createFileNode,
  createFolderNode,
  deleteFileNode,
  deriveProjectLanguages,
  getNodePath,
  moveFileNode,
  renameFileNode,
} from './fileTree';
import { tokenizeLine } from './syntaxHighlight';
import { executeFile, processTerminalCommand } from './codeRunner';
import { createSeedProjects } from '../data/seedProjects';

test('permission matrix enforces PDF Section 6.1 strictly', () => {
  const owner = getPermissionsForRole('owner');
  assert.equal(owner.canEditCode, true);
  assert.equal(owner.canManageFiles, true);
  assert.equal(owner.canRunCode, true);
  assert.equal(owner.canRenameProject, true);
  assert.equal(owner.canManageCollaborators, true);
  assert.equal(owner.canRevokeAccess, true);

  const editor = getPermissionsForRole('editor');
  assert.equal(editor.canEditCode, true);
  assert.equal(editor.canManageFiles, true);
  assert.equal(editor.canRunCode, true);
  assert.equal(editor.canRenameProject, false);
  assert.equal(editor.canManageCollaborators, false);
  assert.equal(editor.canRevokeAccess, false);

  const viewer = getPermissionsForRole('viewer');
  assert.equal(viewer.canView, true);
  assert.equal(viewer.canEditCode, false);
  assert.equal(viewer.canManageFiles, false);
  assert.equal(viewer.canRunCode, false);
  assert.equal(viewer.canRenameProject, false);
  assert.equal(viewer.canManageCollaborators, false);
  assert.equal(viewer.isReadOnly, true);
});

test('file tree supports language-independent projects with mixed languages and CRUD', () => {
  const { nodes: n1, created: folder } = createFolderNode([], 'src', null, 'f1');
  assert.equal(folder.type, 'folder');
  assert.equal(folder.language, undefined);

  const { nodes: n2, created: pyFile } = createFileNode(n1, 'solver', 'python', folder.id, 'f2');
  assert.equal(pyFile.name, 'solver.py');
  assert.equal(pyFile.language, 'python');

  const { nodes: n3, created: cppFile } = createFileNode(n2, 'bfs.cpp', 'cpp', null, 'f3');
  assert.equal(cppFile.language, 'cpp');

  const langs = deriveProjectLanguages(n3);
  assert.deepEqual(langs.sort(), ['cpp', 'python']);
  assert.equal(getNodePath(n3, pyFile.id), 'src/solver.py');

  // Rename file
  const renamed = renameFileNode(n3, pyFile.id, 'dijkstra.py');
  assert.equal(renamed.error, undefined);
  assert.equal(getNodePath(renamed.nodes, pyFile.id), 'src/dijkstra.py');

  // Move folder into itself should fail
  const badMove = moveFileNode(renamed.nodes, folder.id, folder.id);
  assert.ok(badMove.error);

  // Move file to root
  const goodMove = moveFileNode(renamed.nodes, pyFile.id, null);
  assert.equal(goodMove.error, undefined);
  assert.equal(getNodePath(goodMove.nodes, pyFile.id), 'dijkstra.py');

  // Delete folder cascades
  const deleted = deleteFileNode(goodMove.nodes, folder.id);
  assert.equal(deleted.removedIds.includes(folder.id), true);
  assert.equal(deleted.nodes.length, 2);
});

test('syntax tokenizer classifies keywords, functions, strings, numbers, and comments', () => {
  const jsTokens = tokenizeLine('const count = compute(42, "ok"); // done', 'javascript');
  assert.ok(jsTokens.some((t) => t.type === 'keyword' && t.value === 'const'));
  assert.ok(jsTokens.some((t) => t.type === 'function' && t.value === 'compute'));
  assert.ok(jsTokens.some((t) => t.type === 'number' && t.value === '42'));
  assert.ok(jsTokens.some((t) => t.type === 'string' && t.value === '"ok"'));
  assert.ok(jsTokens.some((t) => t.type === 'comment' && t.value.includes('done')));

  const pyTokens = tokenizeLine('def solve(x): # python comment', 'python');
  assert.ok(pyTokens.some((t) => t.type === 'keyword' && t.value === 'def'));
  assert.ok(pyTokens.some((t) => t.type === 'function' && t.value === 'solve'));
  assert.ok(pyTokens.some((t) => t.type === 'comment'));
});

test('code runner executes JavaScript genuinely and evaluates Python/C++ output and errors', () => {
  const jsRes = executeFile({
    id: '1',
    name: 'calc.js',
    type: 'file',
    parentId: null,
    language: 'javascript',
    content: 'const x = 6 * 7;\nconsole.log("Answer:", x);',
    updatedAt: new Date().toISOString(),
  });
  assert.equal(jsRes.status, 'success');
  assert.equal(jsRes.stdout, 'Answer: 42');

  const pyErr = executeFile({
    id: '2',
    name: 'broken.py',
    type: 'file',
    parentId: null,
    language: 'python',
    content: 'def broken()\n    print("oops")',
    updatedAt: new Date().toISOString(),
  });
  assert.equal(pyErr.status, 'error');
  assert.ok(pyErr.stderr.includes('SyntaxError'));

  const projects = createSeedProjects();
  const algoLab = projects[0];
  const termLs = processTerminalCommand('ls', {
    projectId: algoLab.id,
    projectName: algoLab.name,
    nodes: algoLab.nodes,
    userName: 'Om Upadhyay',
    canRunCode: true,
  });
  assert.ok(termLs.outputLines.some((line) => line.includes('graphs/bfs.cpp')));
  assert.ok(termLs.outputLines.some((line) => line.includes('solver.py')));

  const termDenied = processTerminalCommand('run utils.js', {
    projectId: algoLab.id,
    projectName: algoLab.name,
    nodes: algoLab.nodes,
    userName: 'Om Upadhyay',
    canRunCode: false,
  });
  assert.equal(termDenied.isError, true);
});
