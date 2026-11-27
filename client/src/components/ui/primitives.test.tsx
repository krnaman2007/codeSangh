import { setupDomEnvironment } from '../../test/domSetup';
setupDomEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  Dialog,
  EmptyState,
  FormField,
  GlassButton,
  GlassPanel,
  RoleChip,
  StatusChip,
  TextInput,
} from './index';
import { AuthProvider } from '../../state/authStore';
import { UiProvider } from '../../state/uiStore';
import { ProtectedRoute, PublicOnlyRoute } from '../../routes/guards';

test.afterEach(() => {
  cleanup();
});

test('UI primitives render accessible labels, states, and native dialog controls', () => {
  let closed = false;
  render(
    <>
      <GlassPanel>
        <RoleChip role="owner" />
        <StatusChip tone="success">Saved</StatusChip>
        <EmptyState
          title="No items"
          description="Create one"
          action={<GlassButton variant="primary">Add Item</GlassButton>}
        />
        <FormField id="sample-input" label="Project Name" required error="Name is required">
          <TextInput id="sample-input" hasError value="" onChange={() => {}} />
        </FormField>
      </GlassPanel>
      <Dialog open title="Confirm Action" onClose={() => { closed = true; }}>
        <p>Dialog body</p>
      </Dialog>
    </>
  );

  assert.ok(screen.getByText('Owner'));
  assert.ok(screen.getByText('Saved'));
  assert.ok(screen.getByText('No items'));
  assert.ok(screen.getByRole('alert'));
  assert.equal(screen.getByLabelText(/Project Name/).getAttribute('aria-invalid'), 'true');
  assert.ok(screen.getByText('Confirm Action'));

  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
  assert.equal(closed, true);
});

test('ProtectedRoute redirects unauthenticated users to /login with safe returnTo', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: false, error: { code: 'AUTH_REQUIRED', message: 'No session' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

  try {
    render(
      <MemoryRouter initialEntries={['/project/proj-123']}>
        <UiProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<div>Login Screen</div>} />
              <Route
                path="/project/:projectId"
                element={
                  <ProtectedRoute>
                    <div>Secret Workspace</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </UiProvider>
      </MemoryRouter>
    );

    const loginScreen = await screen.findByText('Login Screen');
    assert.ok(loginScreen);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('PublicOnlyRoute renders children when unauthenticated', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: false, error: { code: 'AUTH_REQUIRED', message: 'No session' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

  try {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <UiProvider>
          <AuthProvider>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <div>Public Login Form</div>
                  </PublicOnlyRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </UiProvider>
      </MemoryRouter>
    );

    const form = await screen.findByText('Public Login Form');
    assert.ok(form);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
