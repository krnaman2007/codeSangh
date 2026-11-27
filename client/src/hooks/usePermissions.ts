import { useMemo } from 'react';
import type { Role } from '../types/devsync';
import { getPermissionsForRole, type RolePermissions } from '../utils/permissions';

export type CapabilityKey =
  | 'view'
  | 'editCode'
  | 'manageFiles'
  | 'runCode'
  | 'useTerminal'
  | 'debug'
  | 'useSourceControl'
  | 'manageGitRemote'
  | 'shareProject'
  | 'manageCollaborators'
  | 'renameProject'
  | 'deleteProject'
  | 'clearExecutionHistory'
  | 'editEnvironment'
  | 'applyAiChanges'
  | 'joinVoice';

export interface WorkspaceCapabilities extends RolePermissions {
  role: Role;
  canUseTerminal: boolean;
  canDebug: boolean;
  canUseSourceControl: boolean;
  canManageGitRemote: boolean;
  canShareProject: boolean;
  canDeleteProject: boolean;
  canClearExecutionHistory: boolean;
  canEditEnvironment: boolean;
  canApplyAiChanges: boolean;
  canJoinVoice: boolean;
  denialReason: (capability: CapabilityKey) => string | undefined;
}

export function getCapabilitiesForRole(role: Role): WorkspaceCapabilities {
  const base = getPermissionsForRole(role);
  const isOwner = role === 'owner';
  const isEditorPlus = role === 'owner' || role === 'editor';

  const capabilities: Omit<WorkspaceCapabilities, 'denialReason'> = {
    ...base,
    role,
    canUseTerminal: isEditorPlus,
    canDebug: isEditorPlus,
    canUseSourceControl: isEditorPlus,
    canManageGitRemote: isOwner,
    canShareProject: isOwner,
    canDeleteProject: isOwner,
    canClearExecutionHistory: isOwner,
    canEditEnvironment: isOwner,
    canApplyAiChanges: isEditorPlus,
    canJoinVoice: true,
  };

  return {
    ...capabilities,
    denialReason: (capability: CapabilityKey): string | undefined => {
      switch (capability) {
        case 'view':
          return capabilities.canView ? undefined : 'You do not have access to this project.';
        case 'editCode':
          return capabilities.canEditCode
            ? undefined
            : 'Viewers have read-only access and cannot edit source code.';
        case 'manageFiles':
          return capabilities.canManageFiles
            ? undefined
            : 'Viewers cannot create, rename, move, or delete files or folders.';
        case 'runCode':
          return capabilities.canRunCode
            ? undefined
            : 'Viewers cannot execute code. Ask the project owner for Edit Access.';
        case 'useTerminal':
          return capabilities.canUseTerminal
            ? undefined
            : 'Interactive terminal commands require Editor or Owner access.';
        case 'debug':
          return capabilities.canDebug
            ? undefined
            : 'Viewers can observe active debug sessions but cannot start or step through debugging.';
        case 'useSourceControl':
          return capabilities.canUseSourceControl
            ? undefined
            : 'Source control mutations require Editor or Owner access.';
        case 'manageGitRemote':
          return capabilities.canManageGitRemote
            ? undefined
            : 'Only the Project Owner can configure Git remotes or clone repositories.';
        case 'shareProject':
        case 'manageCollaborators':
          return capabilities.canManageCollaborators
            ? undefined
            : 'Only the Project Owner can manage collaborators.';
        case 'renameProject':
          return capabilities.canRenameProject
            ? undefined
            : 'Only the Project Owner can rename the project.';
        case 'deleteProject':
          return capabilities.canDeleteProject
            ? undefined
            : 'Only the Project Owner can delete this project.';
        case 'clearExecutionHistory':
          return capabilities.canClearExecutionHistory
            ? undefined
            : 'Only the Project Owner can clear project execution history.';
        case 'editEnvironment':
          return capabilities.canEditEnvironment
            ? undefined
            : 'Only the Project Owner can modify shared environment settings.';
        case 'applyAiChanges':
          return capabilities.canApplyAiChanges
            ? undefined
            : 'Viewers cannot apply AI code suggestions to project files.';
        case 'joinVoice':
          return undefined;
      }
    },
  };
}

export function usePermissions(role: Role): WorkspaceCapabilities {
  return useMemo(() => getCapabilitiesForRole(role), [role]);
}
