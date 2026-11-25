import type { Role } from '../types/devsync';

export interface RolePermissions {
  canView: boolean;
  canEditCode: boolean;
  canManageFiles: boolean;
  canRunCode: boolean;
  canManageCollaborators: boolean;
  canRenameProject: boolean;
  canRevokeAccess: boolean;
  isReadOnly: boolean;
}

/**
 * Strictly enforces Section 6.1 Permission Comparison from DevSync spec:
 * - Owner: Full access (edit, CRUD files/folders, run, rename project, manage/revoke collaborators)
 * - Editor: Edit code, CRUD files/folders, run code. Cannot rename project or manage collaborators.
 * - Viewer: Read-only viewing. Cannot edit, CRUD files/folders, run code, rename, or manage collaborators.
 */
export function getPermissionsForRole(role: Role): RolePermissions {
  switch (role) {
    case 'owner':
      return {
        canView: true,
        canEditCode: true,
        canManageFiles: true,
        canRunCode: true,
        canManageCollaborators: true,
        canRenameProject: true,
        canRevokeAccess: true,
        isReadOnly: false,
      };
    case 'editor':
      return {
        canView: true,
        canEditCode: true,
        canManageFiles: true,
        canRunCode: true,
        canManageCollaborators: false,
        canRenameProject: false,
        canRevokeAccess: false,
        isReadOnly: false,
      };
    case 'viewer':
      return {
        canView: true,
        canEditCode: false,
        canManageFiles: false,
        canRunCode: false,
        canManageCollaborators: false,
        canRenameProject: false,
        canRevokeAccess: false,
        isReadOnly: true,
      };
  }
}

export function formatRoleLabel(role: Role): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'editor':
      return 'Editor';
    case 'viewer':
      return 'Viewer';
  }
}
