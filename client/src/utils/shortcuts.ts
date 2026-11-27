export type PlatformKind = 'mac' | 'windows' | 'linux';

export type ShortcutAction =
  | 'command-palette'
  | 'save-file'
  | 'toggle-sidebar'
  | 'toggle-terminal'
  | 'run-file'
  | 'new-file'
  | 'new-folder'
  | 'rename-node'
  | 'delete-node';

export interface ShortcutEventLike {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export interface ShortcutBinding {
  action: ShortcutAction;
  label: string;
  keyDisplay: Record<PlatformKind, string>;
}

export const WORKSPACE_SHORTCUTS: ShortcutBinding[] = [
  {
    action: 'command-palette',
    label: 'Command Palette',
    keyDisplay: { mac: '⌘K', windows: 'Ctrl+K', linux: 'Ctrl+K' },
  },
  {
    action: 'save-file',
    label: 'Save File',
    keyDisplay: { mac: '⌘S', windows: 'Ctrl+S', linux: 'Ctrl+S' },
  },
  {
    action: 'toggle-sidebar',
    label: 'Toggle Explorer',
    keyDisplay: { mac: '⌘B', windows: 'Ctrl+B', linux: 'Ctrl+B' },
  },
  {
    action: 'toggle-terminal',
    label: 'Toggle Terminal',
    keyDisplay: { mac: '⌃` / ⌘J', windows: 'Ctrl+` / Ctrl+J', linux: 'Ctrl+` / Ctrl+J' },
  },
  {
    action: 'run-file',
    label: 'Run Active File',
    keyDisplay: { mac: '⌘↵', windows: 'Ctrl+Enter', linux: 'Ctrl+Enter' },
  },
  {
    action: 'new-file',
    label: 'New File',
    keyDisplay: { mac: '⌥N', windows: 'Alt+N', linux: 'Alt+N' },
  },
  {
    action: 'new-folder',
    label: 'New Folder',
    keyDisplay: { mac: '⌥⇧N', windows: 'Alt+Shift+N', linux: 'Alt+Shift+N' },
  },
  {
    action: 'rename-node',
    label: 'Rename Selected (Explorer)',
    keyDisplay: { mac: 'F2', windows: 'F2', linux: 'F2' },
  },
  {
    action: 'delete-node',
    label: 'Delete Selected (Explorer)',
    keyDisplay: { mac: '⌘⌫ / Del', windows: 'Delete', linux: 'Delete' },
  },
];

export function detectPlatform(userAgent?: string): PlatformKind {
  const ua = (
    userAgent ??
    (typeof navigator !== 'undefined' ? navigator.platform || navigator.userAgent : '')
  ).toLowerCase();
  if (ua.includes('mac') || ua.includes('darwin')) return 'mac';
  if (ua.includes('win')) return 'windows';
  return 'linux';
}

export function isPrimaryModifier(e: ShortcutEventLike, platform: PlatformKind): boolean {
  if (platform === 'mac') {
    return e.metaKey && !e.ctrlKey;
  }
  return e.ctrlKey && !e.metaKey;
}

/**
 * Matches global workspace keyboard shortcuts with strict platform modifier rules
 * so browser-reserved shortcuts (e.g. Cmd/Ctrl+N, Cmd/Ctrl+W, Cmd/Ctrl+R) never collide.
 */
export function matchWorkspaceShortcut(
  e: ShortcutEventLike,
  platform: PlatformKind,
  context: { inExplorer?: boolean; inTextInput?: boolean } = {}
): ShortcutAction | null {
  const key = e.key.toLowerCase();
  const primary = isPrimaryModifier(e, platform);

  if (primary && !e.altKey && !e.shiftKey && key === 'k') {
    return 'command-palette';
  }
  if (primary && !e.altKey && !e.shiftKey && key === 's') {
    return 'save-file';
  }
  if (primary && !e.altKey && !e.shiftKey && key === 'b') {
    return 'toggle-sidebar';
  }
  if (primary && !e.altKey && !e.shiftKey && key === 'j') {
    return 'toggle-terminal';
  }
  if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (key === '`' || e.code === 'Backquote')) {
    return 'toggle-terminal';
  }
  if (primary && !e.altKey && !e.shiftKey && key === 'enter') {
    return 'run-file';
  }
  if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && key === 'n') {
    return context.inTextInput ? null : 'new-file';
  }
  if (e.altKey && !e.metaKey && !e.ctrlKey && e.shiftKey && key === 'n') {
    return context.inTextInput ? null : 'new-folder';
  }

  if (context.inExplorer && !context.inTextInput) {
    if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key === 'F2') {
      return 'rename-node';
    }
    if (
      e.key === 'Delete' ||
      (platform === 'mac' && e.metaKey && e.key === 'Backspace')
    ) {
      return 'delete-node';
    }
  }

  return null;
}
