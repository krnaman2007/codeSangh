import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Code2,
  FolderTree,
  LayoutDashboard,
  Play,
  Shield,
  Terminal,
  Users,
} from 'lucide-react';
import { BrandLogo } from './BrandMark';
import { GlassButton, GlassPanel, RoleChip } from './ui';
import { useAuth } from '../state/authStore';

interface LandingPageProps {
  onGetStarted: () => void;
  onOpenDemo: () => void;
}

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Create a project',
    detail: 'Name your workspace without locking into a single language runtime.',
  },
  {
    step: '02',
    title: 'Mix languages per file',
    detail: 'Organize folders and pick JavaScript, Python, C++, Java, HTML, or CSS per file.',
  },
  {
    step: '03',
    title: 'Run, inspect & share',
    detail: 'Execute code, inspect output history, and invite collaborators as Editors or Viewers.',
  },
];

export function LandingPage({ onGetStarted, onOpenDemo }: LandingPageProps) {
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';

  return (
    <div className="marketing-scroll min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)] flex flex-col">
      <a
        href="#main-content"
        className="visually-hidden fixed top-3 left-3 z-50 px-3.5 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--text-primary)] text-[13px] font-medium"
      >
        Skip to main content
      </a>

      {/* Sticky Translucent Glass Header */}
      <header className="sticky top-0 z-30 glass-toolbar border-b">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <a
            href="#top"
            className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0"
          >
            <BrandLogo size={20} />
            <span>DevSync</span>
          </a>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-[13px] text-[var(--text-secondary)]"
          >
            <a
              href="#capabilities"
              className="hover:text-[var(--text-primary)] transition-mechanical whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#workflow"
              className="hover:text-[var(--text-primary)] transition-mechanical whitespace-nowrap shrink-0"
            >
              Workflow
            </a>
            <a
              href="#permissions"
              className="hover:text-[var(--text-primary)] transition-mechanical whitespace-nowrap shrink-0"
            >
              Permissions
            </a>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="hover:text-[var(--text-primary)] transition-mechanical whitespace-nowrap shrink-0"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="hover:text-[var(--text-primary)] transition-mechanical whitespace-nowrap shrink-0"
              >
                Sign In
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <GlassButton variant="glass" size="md" className="rounded-full" onClick={onOpenDemo}>
              <Play className="w-3.5 h-3.5 text-[var(--text-secondary)]" strokeWidth={1.5} />
              <span>Live Demo</span>
            </GlassButton>
            {isAuthenticated ? (
              <Link to="/dashboard">
                <GlassButton variant="primary" size="md" className="rounded-full">
                  <LayoutDashboard className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Dashboard</span>
                </GlassButton>
              </Link>
            ) : (
              <Link to="/register" className="hidden sm:inline-flex">
                <GlassButton variant="primary" size="md" className="rounded-full">
                  <span>Get Started</span>
                </GlassButton>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* Hero */}
        <section id="top" className="relative overflow-hidden border-b border-[var(--border-hairline)] bg-hairline-grid">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute -top-20 right-[8%] w-72 h-72 rounded-full opacity-55"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, #262638 0%, #111116 58%, #050507 100%)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)',
              }}
            />
            <div
              className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full opacity-40"
              style={{
                background:
                  'radial-gradient(circle at 40% 25%, #232332 0%, #0E0E13 60%, #050507 100%)',
              }}
            />
          </div>

          <div className="relative max-w-[1200px] mx-auto px-6 py-20 lg:py-26 reveal-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7">
                <p className="text-[13px] font-mono text-[var(--text-secondary)] mb-4">
                  Browser-based collaborative IDE · Polyglot by file
                </p>
                <h1
                  className="text-[clamp(2.35rem,5vw,3.75rem)] font-semibold tracking-[-0.035em] leading-[1.06] text-[var(--text-primary)] max-w-xl"
                  style={{ textWrap: 'balance' }}
                >
                  Write, run, and ship code together in one calm workspace.
                </h1>
                <p className="mt-6 text-[16px] leading-relaxed text-[var(--text-secondary)] max-w-lg">
                  Create language-independent projects, organize C++, Python, Java, and
                  JavaScript files side-by-side, collaborate with live cursors, and execute files
                  with full history.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3.5">
                  {isAuthenticated ? (
                    <Link to="/dashboard">
                      <GlassButton variant="primary" size="lg" className="hover-lift">
                        <span>Open Dashboard</span>
                        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </GlassButton>
                    </Link>
                  ) : (
                    <GlassButton
                      variant="primary"
                      size="lg"
                      className="hover-lift"
                      onClick={onGetStarted}
                    >
                      <span>Sign In to Workspace</span>
                      <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                    </GlassButton>
                  )}

                  <GlassButton
                    variant="glass"
                    size="lg"
                    className="hover-lift"
                    onClick={onOpenDemo}
                  >
                    <Play className="w-3.5 h-3.5 text-[var(--text-secondary)]" strokeWidth={1.5} />
                    <span>Launch Live Demo</span>
                  </GlassButton>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--text-muted)] font-mono">
                  <span>Per-File Language Runtimes</span>
                  <span aria-hidden="true">·</span>
                  <span>Live Cursor Sync</span>
                  <span aria-hidden="true">·</span>
                  <span>Owner / Editor / Viewer Access</span>
                </div>
              </div>

              {/* Glassmorphic Framed Workspace Preview */}
              <div className="lg:col-span-5">
                <GlassPanel variant="elevated" className="overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-hairline)] bg-[var(--surface-elevated)]">
                    <div className="flex items-center gap-2 font-mono text-[12px] text-[var(--text-secondary)]">
                      <span>AlgoLab</span>
                      <span className="text-[var(--text-muted)]">/</span>
                      <span className="text-[var(--text-primary)]">solver.py</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--text-muted)]">
                      <span>Python 3</span>
                      <span className="text-[var(--state-success)]">Saved</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 bg-[var(--surface-base)]">
                    <div className="col-span-5 sm:col-span-4 border-r border-[var(--border-hairline)] p-3 text-[12px] font-mono space-y-1.5 bg-[#08080C]">
                      <div className="text-[var(--text-muted)] text-[10px] tracking-wider uppercase mb-2">
                        Explorer
                      </div>
                      <div className="text-[var(--text-secondary)] truncate">graphs/bfs.cpp</div>
                      <div className="text-[var(--text-primary)] bg-[var(--surface-hover)] rounded px-1.5 py-0.5 truncate">
                        solver.py
                      </div>
                      <div className="text-[var(--text-secondary)] truncate">utils.js</div>
                      <div className="text-[var(--text-secondary)] truncate">index.html</div>
                    </div>
                    <div className="col-span-7 sm:col-span-8 p-3.5 font-mono text-[12px] leading-6 overflow-x-auto">
                      <div>
                        <span className="text-[#6e738d] italic"># Shortest path solver</span>
                      </div>
                      <div>
                        <span className="text-[#A78BFA]">def</span>{' '}
                        <span className="text-[#60A5FA]">dijkstra</span>
                        <span className="text-[#E4E4E7]">(graph, start):</span>
                      </div>
                      <div className="pl-3 flex items-center">
                        <span className="text-[#E4E4E7]">dist = &#123;start: </span>
                        <span className="text-[#FBBF24]">0</span>
                        <span className="text-[#E4E4E7]">&#125;</span>
                        <span className="ml-1.5 inline-flex items-center">
                          <span className="w-[2px] h-4 bg-[var(--accent-primary)]" />
                          <span className="px-1.5 py-0.5 text-[10px] leading-none rounded-r bg-[var(--accent-primary)] text-[var(--text-primary)] font-sans">
                            Aarav
                          </span>
                        </span>
                      </div>
                      <div className="pl-3">
                        <span className="text-[#A78BFA]">return</span>{' '}
                        <span className="text-[#E4E4E7]">dist</span>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-[var(--border-hairline)] text-[11px] text-[#34D399]">
                        stdout · Optimal cost 11 (28ms)
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities */}
        <section
          id="capabilities"
          className="max-w-[1200px] mx-auto px-6 py-20 border-b border-[var(--border-hairline)]"
        >
          <div className="max-w-xl mb-12">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Engineered for polyglot teams
            </h2>
            <p className="mt-2.5 text-[15px] text-[var(--text-secondary)]">
              Every project stays independent of a single language so algorithms, services, and
              web previews live together cleanly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <GlassPanel className="md:col-span-2 p-7 flex flex-col justify-between hover-lift">
              <div>
                <div className="w-9 h-9 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-hairline)] flex items-center justify-center mb-5">
                  <FolderTree className="w-4 h-4 text-[var(--text-primary)]" strokeWidth={1.5} />
                </div>
                <h3 className="text-[17px] font-semibold text-[var(--text-primary)] tracking-tight">
                  01. Language-Independent Projects
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)] max-w-lg">
                  Create a project with only a name, organize folders freely, and assign the
                  programming language per file. Syntax highlighting and runtime selection follow
                  each file automatically.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-[var(--border-hairline)] flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[12px] text-[var(--text-secondary)]">
                <span>JavaScript</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span>Python</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span>C++</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span>Java</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span>HTML</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span>CSS</span>
              </div>
            </GlassPanel>

            <GlassPanel className="p-7 hover-lift">
              <div className="w-9 h-9 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-hairline)] flex items-center justify-center mb-5">
                <Users className="w-4 h-4 text-[var(--text-primary)]" strokeWidth={1.5} />
              </div>
              <h3 className="text-[17px] font-semibold text-[var(--text-primary)] tracking-tight">
                02. Live Cursor Tracking
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                See collaborator cursors, selections, and presence updates in real time while
                editing shared files together.
              </p>
            </GlassPanel>

            <GlassPanel className="p-7 hover-lift">
              <div className="w-9 h-9 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-hairline)] flex items-center justify-center mb-5">
                <Terminal className="w-4 h-4 text-[var(--text-primary)]" strokeWidth={1.5} />
              </div>
              <h3 className="text-[17px] font-semibold text-[var(--text-primary)] tracking-tight">
                03. Instant Execution &amp; History
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
                Run supported files with stdin, inspect stdout/stderr, preview HTML, and audit
                persisted execution logs.
              </p>
            </GlassPanel>

            <GlassPanel id="permissions" className="md:col-span-2 p-7 flex flex-col justify-between hover-lift">
              <div>
                <div className="w-9 h-9 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-hairline)] flex items-center justify-center mb-5">
                  <Shield className="w-4 h-4 text-[var(--text-primary)]" strokeWidth={1.5} />
                </div>
                <h3 className="text-[17px] font-semibold text-[var(--text-primary)] tracking-tight">
                  04. Strict Role-Based Access Control
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)] max-w-lg">
                  Project Owners manage collaborators and settings, Editors create and run code,
                  and Viewers inspect source files and history in safe read-only mode.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-[var(--border-hairline)] grid grid-cols-1 sm:grid-cols-3 gap-4 text-[12px]">
                <div className="space-y-1.5">
                  <RoleChip role="owner" />
                  <p className="text-[var(--text-secondary)]">
                    Edit, run, rename &amp; manage access
                  </p>
                </div>
                <div className="space-y-1.5">
                  <RoleChip role="editor" />
                  <p className="text-[var(--text-secondary)]">
                    Edit files, folders &amp; execute code
                  </p>
                </div>
                <div className="space-y-1.5">
                  <RoleChip role="viewer" />
                  <p className="text-[var(--text-secondary)]">
                    Strict read-only source inspection
                  </p>
                </div>
              </div>
            </GlassPanel>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="max-w-[1200px] mx-auto px-6 py-18">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {WORKFLOW_STEPS.map((item) => (
              <GlassPanel key={item.step} className="p-5">
                <span className="text-[11px] font-mono text-[var(--accent-primary)]">
                  STEP {item.step}
                </span>
                <h3 className="mt-1.5 text-[15px] font-semibold text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  {item.detail}
                </p>
              </GlassPanel>
            ))}
          </div>

          <GlassPanel className="p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                Ready to start coding in DevSync?
              </h2>
              <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
                Create an account for persistent cloud workspaces, or try the interactive demo
                immediately.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to={isAuthenticated ? '/dashboard' : '/register'}>
                <GlassButton variant="glass" size="md" className="rounded-full">
                  <span>{isAuthenticated ? 'Go to Dashboard' : 'Create Account'}</span>
                </GlassButton>
              </Link>
              <GlassButton
                variant="primary"
                size="md"
                className="rounded-full"
                onClick={onOpenDemo}
              >
                <Code2 className="w-4 h-4" strokeWidth={1.5} />
                <span>Launch AlgoLab Demo</span>
              </GlassButton>
            </div>
          </GlassPanel>
        </section>
      </main>

      <footer className="border-t border-[var(--border-hairline)] py-6">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <BrandLogo size={16} />
            <span className="text-[var(--text-secondary)] font-medium">DevSync</span>
            <span aria-hidden="true">·</span>
            <span>Collaborative Browser Development Platform</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/login" className="hover:text-[var(--text-primary)] transition-mechanical">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-[var(--text-primary)] transition-mechanical">
              Register
            </Link>
            <button
              type="button"
              onClick={onOpenDemo}
              className="hover:text-[var(--text-primary)] transition-mechanical cursor-pointer"
            >
              Demo Workspace
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
