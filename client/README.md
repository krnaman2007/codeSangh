# DevSync Client

Browser-based collaborative polyglot IDE built with React, Vite, Tailwind CSS, TanStack Query, Monaco Editor, Socket.IO, Yjs, and xterm.js.

## Local Development

1. **Install dependencies**
   ```bash
   cd client && npm install
   ```
2. **Environment variables** (`client/.env`, copied from `client/.env.example`)
   - `VITE_API_BASE_URL=/api/v1` (proxied to `VITE_DEV_PROXY_TARGET=http://localhost:5000` in dev)
   - `VITE_SOCKET_URL=` (optional explicit Socket.IO origin; defaults to Vite proxy in dev)
   - Feature flags (all default to `true`; set to `false` to disable a surface):
     - `VITE_FEATURE_TERMINAL_SOCKET`
     - `VITE_FEATURE_DEBUG`
     - `VITE_FEATURE_GIT`
     - `VITE_FEATURE_ENVIRONMENT`
     - `VITE_FEATURE_VOICE`
     - `VITE_FEATURE_AI`
3. **Run client & server**
   ```bash
   # Terminal 1: Backend REST server (port 5000)
   cd server && npm run dev

   # Terminal 2: Frontend Vite dev server (port 3000)
   cd client && npm run dev
   ```
4. **Verify typecheck, production build, and tests**
   ```bash
   cd client && npm run lint && npm run build && npm test
   ```

## Backend Dependencies & Feature Availability

- **Production REST APIs integrated:** Auth (`/auth/*`), Users (`/users/*`), Languages (`/languages`), Projects (`/projects/*`), Nodes (`/tree`, `/folders`, `/files/*`, `/nodes/*`), Collaborators (`/collaborators/*`), Execution & History (`/run`, `/executions/*`), Debug & Breakpoints (`/debug/*`, `/breakpoints`), Git Repo/Init/Remote/Clone/Status (`/git/*`).
- **Graceful fallback / pending backend socket services:** Realtime Socket.IO + Yjs (`server/src/sockets`), container terminal streaming, live DAP stepping, Git stage/commit/push/pull, shared environment provisioning, WebRTC voice signaling, and streaming AI completions degrade gracefully to REST sync, virtual shell, or clear status indicators until their corresponding server socket/REST endpoints are enabled.

## Demo Seed & `localStorage` Removal Plan

- All authenticated routes (`/dashboard`, `/project/:projectId`) use the real REST API + TanStack Query cache and in-memory access tokens + httpOnly refresh cookies.
- The interactive standalone demo (`/demo`) uses `DemoWorkspaceShell` + `seedProjects.ts` (`devsync_demo_projects_v1` in `localStorage`). Once public read-only sandbox workspaces are hosted on the backend, `/demo` can be pointed to a seeded guest project or removed cleanly by deleting `DemoWorkspaceShell.tsx` and `data/seedProjects.ts`.
