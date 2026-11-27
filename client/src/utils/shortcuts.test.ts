import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORKSPACE_SHORTCUTS,
  matchWorkspaceShortcut,
  type PlatformKind,
} from './shortcuts';

const PLATFORMS: PlatformKind[] = ['mac', 'windows', 'linux'];

test('workspace shortcuts resolve cleanly across macOS, Windows, and Linux without collisions', () => {
  for (const platform of PLATFORMS) {
    const primaryMeta = platform === 'mac';
    const primaryCtrl = platform !== 'mac';

    assert.equal(
      matchWorkspaceShortcut(
        { key: 's', metaKey: primaryMeta, ctrlKey: primaryCtrl, altKey: false, shiftKey: false },
        platform
      ),
      'save-file'
    );
    assert.equal(
      matchWorkspaceShortcut(
        { key: 'k', metaKey: primaryMeta, ctrlKey: primaryCtrl, altKey: false, shiftKey: false },
        platform
      ),
      'command-palette'
    );
    assert.equal(
      matchWorkspaceShortcut(
        { key: 'b', metaKey: primaryMeta, ctrlKey: primaryCtrl, altKey: false, shiftKey: false },
        platform
      ),
      'toggle-sidebar'
    );
    assert.equal(
      matchWorkspaceShortcut(
        { key: 'Enter', metaKey: primaryMeta, ctrlKey: primaryCtrl, altKey: false, shiftKey: false },
        platform
      ),
      'run-file'
    );
    assert.equal(
      matchWorkspaceShortcut(
        { key: '`', code: 'Backquote', metaKey: false, ctrlKey: true, altKey: false, shiftKey: false },
        platform
      ),
      'toggle-terminal'
    );
    assert.equal(
      matchWorkspaceShortcut(
        { key: 'n', metaKey: false, ctrlKey: false, altKey: true, shiftKey: false },
        platform
      ),
      'new-file'
    );
    assert.equal(
      matchWorkspaceShortcut(
        { key: 'N', metaKey: false, ctrlKey: false, altKey: true, shiftKey: true },
        platform
      ),
      'new-folder'
    );

    // Must NOT hijack browser-reserved Cmd/Ctrl+N (new window) or Cmd/Ctrl+W (close tab)
    assert.equal(
      matchWorkspaceShortcut(
        { key: 'n', metaKey: primaryMeta, ctrlKey: primaryCtrl, altKey: false, shiftKey: false },
        platform
      ),
      null
    );
    assert.equal(
      matchWorkspaceShortcut(
        { key: 'w', metaKey: primaryMeta, ctrlKey: primaryCtrl, altKey: false, shiftKey: false },
        platform
      ),
      null
    );
  }
});

test('explorer shortcuts require explorer focus and ignore text inputs', () => {
  assert.equal(
    matchWorkspaceShortcut(
      { key: 'F2', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false },
      'windows',
      { inExplorer: true }
    ),
    'rename-node'
  );
  assert.equal(
    matchWorkspaceShortcut(
      { key: 'F2', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false },
      'windows',
      { inExplorer: false }
    ),
    null
  );
  assert.equal(
    matchWorkspaceShortcut(
      { key: 'n', metaKey: false, ctrlKey: false, altKey: true, shiftKey: false },
      'mac',
      { inTextInput: true }
    ),
    null
  );
  assert.equal(
    matchWorkspaceShortcut(
      { key: 'Backspace', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false },
      'mac',
      { inExplorer: true }
    ),
    'delete-node'
  );
});

test('all shortcut actions have unique non-empty display labels per platform', () => {
  for (const platform of PLATFORMS) {
    const displays = WORKSPACE_SHORTCUTS.map((s) => s.keyDisplay[platform]);
    assert.equal(new Set(displays).size, displays.length);
  }
});
