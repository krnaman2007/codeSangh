import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collaboratorProjectParamSchema,
  inviteCollaboratorSchema,
  updateCollaboratorRoleSchema,
  collaboratorMemberParamsSchema,
} from '../src/validators/collaborator.schema.js';
import { LIMITS } from '../src/constants/limits.js';

test('Collaborators Module Validation & Business Rules (Endpoints 25-28)', async (t) => {
  const validProjectId = '3f2a9c1e-6140-4c12-8809-5b76612c2a01';
  const validUserId = '4a3b2c1d-7250-4d23-9910-6c87723d3b02';
  const validOwnerId = '5b4c3d2e-8361-4e34-aa21-7d98834e4c03';

  await t.test('Endpoint #25: collaboratorProjectParamSchema (Viewer+)', async () => {
    const valid = collaboratorProjectParamSchema.safeParse({
      params: { projectId: validProjectId },
    });
    assert.equal(valid.success, true);

    const invalid = collaboratorProjectParamSchema.safeParse({
      params: { projectId: 'invalid-id' },
    });
    assert.equal(invalid.success, false);
  });

  await t.test('Endpoint #26: inviteCollaboratorSchema (Owner)', async () => {
    // Valid invite with role 'editor'
    const validEditor = inviteCollaboratorSchema.safeParse({
      params: { projectId: validProjectId },
      body: { email: 'collab@example.com', role: 'editor' },
    });
    assert.equal(validEditor.success, true);
    assert.equal(validEditor.data.body.email, 'collab@example.com');
    assert.equal(validEditor.data.body.role, 'editor');

    // Valid invite with role 'viewer'
    const validViewer = inviteCollaboratorSchema.safeParse({
      params: { projectId: validProjectId },
      body: { email: 'VIEWER@EXAMPLE.COM', role: 'viewer' },
    });
    assert.equal(validViewer.success, true);
    assert.equal(validViewer.data.body.email, 'viewer@example.com'); // lowercased

    // Invalid email
    const invalidEmail = inviteCollaboratorSchema.safeParse({
      params: { projectId: validProjectId },
      body: { email: 'not-an-email', role: 'editor' },
    });
    assert.equal(invalidEmail.success, false);

    // Invalid role (e.g. admin or owner)
    const invalidRole = inviteCollaboratorSchema.safeParse({
      params: { projectId: validProjectId },
      body: { email: 'collab@example.com', role: 'admin' },
    });
    assert.equal(invalidRole.success, false);
  });

  await t.test('Endpoint #27: updateCollaboratorRoleSchema (Owner)', async () => {
    // Valid role change to viewer
    const valid = updateCollaboratorRoleSchema.safeParse({
      params: { projectId: validProjectId, userId: validUserId },
      body: { role: 'viewer' },
    });
    assert.equal(valid.success, true);
    assert.equal(valid.data.body.role, 'viewer');

    // Valid role change to editor
    const validEditor = updateCollaboratorRoleSchema.safeParse({
      params: { projectId: validProjectId, userId: validUserId },
      body: { role: 'editor' },
    });
    assert.equal(validEditor.success, true);

    // Invalid role
    const invalidRole = updateCollaboratorRoleSchema.safeParse({
      params: { projectId: validProjectId, userId: validUserId },
      body: { role: 'moderator' },
    });
    assert.equal(invalidRole.success, false);

    // Invalid userId
    const invalidUserId = updateCollaboratorRoleSchema.safeParse({
      params: { projectId: validProjectId, userId: 'bad-uuid' },
      body: { role: 'editor' },
    });
    assert.equal(invalidUserId.success, false);
  });

  await t.test('Endpoint #28: collaboratorMemberParamsSchema (Owner / self)', async () => {
    const valid = collaboratorMemberParamsSchema.safeParse({
      params: { projectId: validProjectId, userId: validUserId },
    });
    assert.equal(valid.success, true);

    const invalid = collaboratorMemberParamsSchema.safeParse({
      params: { projectId: validProjectId, userId: 'not-valid' },
    });
    assert.equal(invalid.success, false);
  });

  await t.test('Limits & Business Rules for Collaborators', async () => {
    // 20 collaborators per project limit
    assert.equal(LIMITS.COLLABORATORS_PER_PROJECT, 20);

    // Self-invite guard logic simulation
    const ownerEmail = 'owner@example.com';
    const isSelfInvite = (inviteEmail) => inviteEmail.toLowerCase() === ownerEmail.toLowerCase();
    assert.equal(isSelfInvite('owner@example.com'), true);
    assert.equal(isSelfInvite('OWNER@EXAMPLE.COM'), true);
    assert.equal(isSelfInvite('other@example.com'), false);

    // Owner cannot change owner's role or remove owner
    const isOwnerTarget = (targetUserId, projectOwnerId) => targetUserId === projectOwnerId;
    assert.equal(isOwnerTarget(validOwnerId, validOwnerId), true);
    assert.equal(isOwnerTarget(validUserId, validOwnerId), false);

    // Leave project vs Remove collaborator access check
    const canRemoveCollaborator = (callerRole, callerId, targetUserId) => {
      if (callerRole === 'owner') return true;
      // non-owners can only remove themselves (leave project)
      return callerId === targetUserId;
    };

    // Owner can remove collaborator
    assert.equal(canRemoveCollaborator('owner', validOwnerId, validUserId), true);
    // Collaborator can remove themselves (leave)
    assert.equal(canRemoveCollaborator('editor', validUserId, validUserId), true);
    assert.equal(canRemoveCollaborator('viewer', validUserId, validUserId), true);
    // Collaborator CANNOT remove another collaborator
    assert.equal(canRemoveCollaborator('editor', validUserId, 'other-user-uuid'), false);
    assert.equal(canRemoveCollaborator('viewer', validUserId, 'other-user-uuid'), false);
  });
});
