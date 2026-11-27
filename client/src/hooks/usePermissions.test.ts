import test from 'node:test';
import assert from 'node:assert/strict';
import { getCapabilitiesForRole } from './usePermissions';

test('usePermissions capability matrix covers all workspace surfaces accurately', () => {
  const owner = getCapabilitiesForRole('owner');
  assert.equal(owner.canEditCode, true);
  assert.equal(owner.canManageFiles, true);
  assert.equal(owner.canRunCode, true);
  assert.equal(owner.canUseTerminal, true);
  assert.equal(owner.canDebug, true);
  assert.equal(owner.canUseSourceControl, true);
  assert.equal(owner.canManageGitRemote, true);
  assert.equal(owner.canShareProject, true);
  assert.equal(owner.canEditEnvironment, true);
  assert.equal(owner.canApplyAiChanges, true);
  assert.equal(owner.denialReason('shareProject'), undefined);

  const editor = getCapabilitiesForRole('editor');
  assert.equal(editor.canEditCode, true);
  assert.equal(editor.canManageFiles, true);
  assert.equal(editor.canRunCode, true);
  assert.equal(editor.canUseTerminal, true);
  assert.equal(editor.canDebug, true);
  assert.equal(editor.canUseSourceControl, true);
  assert.equal(editor.canApplyAiChanges, true);
  assert.equal(editor.canManageGitRemote, false);
  assert.equal(editor.canShareProject, false);
  assert.equal(editor.canEditEnvironment, false);
  assert.equal(editor.canRenameProject, false);
  assert.ok(editor.denialReason('shareProject'));

  const viewer = getCapabilitiesForRole('viewer');
  assert.equal(viewer.canView, true);
  assert.equal(viewer.canEditCode, false);
  assert.equal(viewer.canManageFiles, false);
  assert.equal(viewer.canRunCode, false);
  assert.equal(viewer.canUseTerminal, false);
  assert.equal(viewer.canDebug, false);
  assert.equal(viewer.canUseSourceControl, false);
  assert.equal(viewer.canShareProject, false);
  assert.equal(viewer.canApplyAiChanges, false);
  assert.equal(viewer.canJoinVoice, true);
  assert.ok(viewer.denialReason('runCode'));
  assert.ok(viewer.denialReason('editCode'));
});
