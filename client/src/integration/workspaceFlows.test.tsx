import { setupDomEnvironment } from '../test/domSetup';
setupDomEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import * as Y from 'yjs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { FileExplorer } from '../components/FileExplorer';
import { ExecutionPanel } from '../components/ExecutionPanel';
import { getCapabilitiesForRole } from '../hooks/usePermissions';
import { YjsWorkspaceManager } from '../realtime/yjsManager';
import { UiProvider } from '../state/uiStore';

const activeClients: QueryClient[] = [];

test.afterEach(() => {
  cleanup();
  while (activeClients.length > 0) {
    activeClients.pop()?.clear();
  }
});

test('FileExplorer surfaces extension rule on creation and enforces viewer restrictions', async () => {
  let createdArgs: { name: string; language: string } | null = null;

  const { rerender } = render(
    <FileExplorer
      nodes={[]}
      activeFileId={null}
      canManageFiles={true}
      onSelectFile={() => {}}
      onCreateFolder={() => ({})}
      onCreateFile={(name, language) => {
        createdArgs = { name, language };
        return { createdId: 'f-new' };
      }}
      onRenameNode={() => ({})}
      onMoveNode={() => ({})}
      onDeleteNode={() => {}}
      externalCreateFileTrigger={0}
      externalCreateFolderTrigger={0}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'New File' }));
  const fileInput = await screen.findByLabelText(/File Name/i);
  fireEvent.change(fileInput, { target: { value: 'helper' } });
  assert.ok(screen.getByText(/Will be created as helper\.py/));

  fireEvent.click(screen.getByRole('button', { name: /Create File/i }));
  assert.deepEqual(createdArgs, { name: 'helper', language: 'python' });

  // Viewer mode disables New File and New Folder
  rerender(
    <FileExplorer
      nodes={[]}
      activeFileId={null}
      canManageFiles={false}
      onSelectFile={() => {}}
      onCreateFolder={() => ({})}
      onCreateFile={() => ({})}
      onRenameNode={() => ({})}
      onMoveNode={() => ({})}
      onDeleteNode={() => {}}
      externalCreateFileTrigger={0}
      externalCreateFolderTrigger={0}
    />
  );

  assert.equal(screen.getByRole('button', { name: 'New File' }).hasAttribute('disabled'), true);
  assert.equal(screen.getByRole('button', { name: 'New Folder' }).hasAttribute('disabled'), true);
});

test('ExecutionPanel renders execution metadata and handles deleted file recovery notice', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/executions/exec-1')) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            execution: {
              id: 'exec-1',
              projectId: 'p1',
              fileId: 'deleted-file-id',
              userId: 'u1',
              language: 'python',
              status: 'success',
              stdout: '42\n',
              stderr: null,
              time: 0.032,
              memory: 4096,
              createdAt: new Date().toISOString(),
              file: null,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          total: 1,
          executions: [
            {
              id: 'exec-1',
              projectId: 'p1',
              fileId: 'deleted-file-id',
              userId: 'u1',
              language: 'python',
              status: 'success',
              time: 0.032,
              memory: 4096,
              createdAt: new Date().toISOString(),
              file: null,
            },
          ],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    activeClients.push(qc);
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <UiProvider>
            <ExecutionPanel
              projectId="p1"
              nodes={[]}
              activeFile={null}
              permissions={getCapabilitiesForRole('editor')}
              activeTab="history"
              onTabChange={() => {}}
              latestExecution={null}
              isRunning={false}
              stdin=""
              onStdinChange={() => {}}
              onOpenFile={() => {}}
            />
          </UiProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const row = await screen.findByText(/Deleted file/);
    fireEvent.click(row);
    assert.ok(await screen.findByText(/Original file was deleted from the tree/));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Two-client YjsWorkspaceManager converges concurrent edits cleanly', () => {
  const managerA = new YjsWorkspaceManager();
  const managerB = new YjsWorkspaceManager();

  const updatesFromA: Uint8Array[] = [];
  const updatesFromB: Uint8Array[] = [];

  const docA = managerA.getOrCreateDoc(
    'file-1',
    { id: 'u1', name: 'Om' },
    (_fid, u) => updatesFromA.push(u)
  );
  const docB = managerB.getOrCreateDoc(
    'file-1',
    { id: 'u2', name: 'Riya' },
    (_fid, u) => updatesFromB.push(u)
  );

  managerA.seedInitialContent('file-1', 'hello');
  for (const u of updatesFromA.splice(0)) {
    managerB.applyRemoteUpdate('file-1', u);
  }
  assert.equal(docB.yText.toString(), 'hello');

  // Concurrent edits
  docA.doc.transact(() => docA.yText.insert(5, ' world'));
  docB.doc.transact(() => docB.yText.insert(0, '// '));

  for (const u of updatesFromA.splice(0)) managerB.applyRemoteUpdate('file-1', u);
  for (const u of updatesFromB.splice(0)) managerA.applyRemoteUpdate('file-1', u);

  // Also verify Y.encodeStateAsUpdate state vector sync converges identically
  assert.equal(docA.yText.toString(), docB.yText.toString());
  assert.equal(docA.yText.toString(), '// hello world');
  assert.ok(Y.encodeStateAsUpdate(docA.doc).byteLength > 0);

  managerA.destroyAll();
  managerB.destroyAll();
});
