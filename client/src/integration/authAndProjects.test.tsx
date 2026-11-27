import { setupDomEnvironment } from '../test/domSetup';
setupDomEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthView } from '../components/AuthView';
import { DashboardPage } from '../components/DashboardPage';
import { AuthProvider } from '../state/authStore';
import { UiProvider } from '../state/uiStore';

const activeClients: QueryClient[] = [];

test.afterEach(() => {
  cleanup();
  while (activeClients.length > 0) {
    activeClients.pop()?.clear();
  }
});

test('AuthView validates inputs, toggles password visibility, and completes API login flow', async () => {
  const originalFetch = globalThis.fetch;
  let loginCalled = false;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/auth/refresh')) {
      return new Response(JSON.stringify({ success: false, error: { code: 'AUTH_REQUIRED', message: 'None' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.endsWith('/auth/login')) {
      loginCalled = true;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            accessToken: 'jwt-test-token',
            user: { id: 'u1', name: 'Om Upadhyay', email: 'om@devsync.dev' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(JSON.stringify({ success: true, data: { owned: [], shared: [] } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    activeClients.push(qc);
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/login']}>
          <UiProvider>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<AuthView initialMode="login" />} />
                <Route path="/dashboard" element={<div>Dashboard Reached</div>} />
              </Routes>
            </AuthProvider>
          </UiProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const emailInput = await screen.findByLabelText(/Email Address/);
    const passwordInput = screen.getByLabelText(/^Password/);

    // Toggle password visibility
    const toggleBtn = screen.getByRole('button', { name: 'Show password' });
    fireEvent.click(toggleBtn);
    assert.equal(passwordInput.getAttribute('type'), 'text');
    assert.equal(toggleBtn.getAttribute('aria-pressed'), 'true');

    // Submit valid credentials
    fireEvent.change(emailInput, { target: { value: 'om@devsync.dev' } });
    fireEvent.change(passwordInput, { target: { value: 'Secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      assert.equal(loginCalled, true);
      assert.ok(screen.getByText('Dashboard Reached'));
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('DashboardPage loads owned/shared projects, creates project (name-only), and handles API errors', async () => {
  const originalFetch = globalThis.fetch;
  let createPayload: Record<string, unknown> | null = null;
  let projectsListCalls = 0;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/auth/refresh')) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            accessToken: 'jwt-1',
            user: { id: 'u1', name: 'Om', email: 'om@devsync.dev' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url.endsWith('/auth/me')) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { user: { id: 'u1', name: 'Om', email: 'om@devsync.dev' } },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url.includes('/projects') && (!init?.method || init.method === 'GET')) {
      projectsListCalls += 1;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            owned: [
              {
                id: 'p1',
                name: 'AlgoLab',
                fileCount: 3,
                folderCount: 1,
                collaboratorCount: 2,
                updatedAt: new Date().toISOString(),
              },
            ],
            shared: [
              {
                id: 'p2',
                name: 'SharedRepo',
                role: 'viewer',
                owner: { id: 'u2', name: 'Riya' },
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url.endsWith('/projects') && init?.method === 'POST') {
      createPayload = JSON.parse(String(init.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            project: {
              id: 'p3',
              name: createPayload.name,
              ownerId: 'u1',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  try {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    activeClients.push(qc);
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <UiProvider>
            <AuthProvider>
              <DashboardPage />
            </AuthProvider>
          </UiProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    assert.ok(await screen.findByText('AlgoLab'));
    assert.ok(screen.getByText('SharedRepo'));
    assert.ok(projectsListCalls >= 1);

    // Open New Project dialog and verify no language selector is asked
    fireEvent.click(screen.getByRole('button', { name: /New Project/i }));
    const nameInput = await screen.findByLabelText(/Project Name/i);
    assert.equal(screen.queryByLabelText(/Programming Language/i), null);

    fireEvent.change(nameInput, { target: { value: 'GraphEngine' } });
    fireEvent.click(screen.getByRole('button', { name: /^Create Project$/i }));

    await waitFor(() => {
      assert.deepEqual(createPayload, { name: 'GraphEngine' });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
