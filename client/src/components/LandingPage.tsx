import { ArrowRight, Code2, Terminal, Users, Shield, Play, FolderTree } from 'lucide-react';
import { BrandLogo } from './BrandMark';

interface LandingPageProps {
  onGetStarted: () => void;
  onOpenDemo: () => void;
}

export function LandingPage({ onGetStarted, onOpenDemo }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#050507] text-[#F4F4F6] flex flex-col">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#050507]/85 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-[#F4F4F6] whitespace-nowrap shrink-0"
          >
            <BrandLogo size={20} />
            <span>DevSync</span>
          </a>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-[13px] text-[#9494A3]"
          >
            <a
              href="#capabilities"
              className="hover:text-[#F4F4F6] transition-mechanical whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#workflow"
              className="hover:text-[#F4F4F6] transition-mechanical whitespace-nowrap shrink-0"
            >
              Workflow
            </a>
            <a
              href="#permissions"
              className="hover:text-[#F4F4F6] transition-mechanical whitespace-nowrap shrink-0"
            >
              Permissions
            </a>
            <button
              type="button"
              onClick={onGetStarted}
              className="hover:text-[#F4F4F6] transition-mechanical whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenDemo}
              className="px-4 py-2 text-[13px] font-medium text-[#F4F4F6] bg-[#111116] hover:bg-[#18181F] border border-white/[0.09] rounded-full transition-mechanical whitespace-nowrap shrink-0 cursor-pointer"
            >
              Live Demo
            </button>
          </div>
        </div>
      </header>

      {/* Matte-Black Minimalist Hero (inspired by monochrome architectural reference) */}
      <main id="top" className="flex-1">
        <section className="relative overflow-hidden border-b border-white/[0.07] bg-hairline-grid">
          {/* Subtle monochrome architectural depth spheres & horizon planes */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute -top-16 right-[8%] w-72 h-72 rounded-full opacity-55"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, #262630 0%, #111116 55%, #050507 100%)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)',
              }}
            />
            <div
              className="absolute top-[46%] right-[28%] w-16 h-16 rounded-full opacity-60"
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, #2A2A35 0%, #111116 65%, #07070A 100%)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08)',
              }}
            />
            <div
              className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full opacity-45"
              style={{
                background:
                  'radial-gradient(circle at 40% 25%, #23232D 0%, #0E0E13 60%, #050507 100%)',
              }}
            />
            <svg
              className="absolute bottom-0 right-0 w-[680px] h-[260px] opacity-40"
              viewBox="0 0 680 260"
              fill="none"
            >
              <path
                d="M120 260C280 220 460 155 680 40V260H120Z"
                fill="url(#obsidianWave)"
              />
              <path
                d="M120 260C280 220 460 155 680 40"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
              <defs>
                <linearGradient id="obsidianWave" x1="400" y1="40" x2="400" y2="260" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1B1B24" />
                  <stop offset="1" stopColor="#050507" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="relative max-w-[1200px] mx-auto px-6 py-24 lg:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7">
                <p className="text-[13px] font-mono text-[#9494A3] mb-4">
                  Browser-based collaborative IDE · Polyglot by file
                </p>
                <h1
                  className="text-[clamp(2.5rem,5vw,3.85rem)] font-semibold tracking-[-0.035em] leading-[1.06] text-[#F4F4F6] max-w-xl"
                  style={{ textWrap: 'balance' }}
                >
                  Write, run, and ship code together in one workspace.
                </h1>
                <p className="mt-6 text-[16px] leading-relaxed text-[#9494A3] max-w-lg">
                  Create language-independent projects, mix C++, Python, Java, and JavaScript
                  side-by-side, track collaborator cursors live, and execute any file with one
                  click.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3.5">
                  <button
                    type="button"
                    onClick={onGetStarted}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#5E5CE6] hover:bg-[#4F46E5] text-[#F4F4F6] text-[14px] font-medium transition-mechanical whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5E5CE6]"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenDemo}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0B0B0F] hover:bg-[#18181F] text-[#F4F4F6] border border-white/[0.12] text-[14px] font-medium transition-mechanical whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                  >
                    <Play className="w-3.5 h-3.5 text-[#9494A3]" strokeWidth={1.5} />
                    <span>Live Demo Workspace</span>
                  </button>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[#5C5C6E] font-mono">
                  <span>6 Language Runtimes</span>
                  <span aria-hidden="true">·</span>
                  <span>Live Cursor Sync</span>
                  <span aria-hidden="true">·</span>
                  <span>Owner / Editor / Viewer Roles</span>
                </div>
              </div>

              {/* Clean restrained workspace preview */}
              <div className="lg:col-span-5">
                <div className="rounded-xl bg-[#0B0B0F] border border-white/[0.08] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] bg-[#111116]">
                    <div className="flex items-center gap-2 font-mono text-[12px] text-[#9494A3]">
                      <span>AlgoLab</span>
                      <span className="text-[#5C5C6E]">/</span>
                      <span className="text-[#F4F4F6]">solver.py</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-[#5C5C6E]">
                      <span>Python 3.12</span>
                      <span className="text-[#22C55E]">Saved</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12">
                    <div className="col-span-4 border-r border-white/[0.07] p-3 text-[12px] font-mono space-y-1.5 bg-[#08080C]">
                      <div className="text-[#5C5C6E] text-[11px] mb-2">FILES</div>
                      <div className="text-[#9494A3] truncate">graphs/bfs.cpp</div>
                      <div className="text-[#F4F4F6] bg-[#18181F] rounded px-1.5 py-0.5 truncate">
                        solver.py
                      </div>
                      <div className="text-[#9494A3] truncate">utils.js</div>
                      <div className="text-[#9494A3] truncate">tests/verify.js</div>
                    </div>
                    <div className="col-span-8 p-3.5 font-mono text-[12px] leading-6 overflow-x-auto">
                      <div>
                        <span className="text-[#525263] italic"># Dijkstra shortest-path</span>
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
                        <span className="ml-1 inline-flex items-center">
                          <span className="w-[2px] h-4 bg-[#5E5CE6]" />
                          <span className="px-1.5 py-0.5 text-[10px] leading-none rounded-r bg-[#5E5CE6] text-[#F4F4F6]">
                            Aarav
                          </span>
                        </span>
                      </div>
                      <div className="pl-3">
                        <span className="text-[#A78BFA]">return</span>{' '}
                        <span className="text-[#E4E4E7]">dist</span>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-white/[0.07] text-[11px] text-[#34D399]">
                        Optimal path A -&gt; F: cost 11 · 31ms
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities — Asymmetric Bento Layout */}
        <section id="capabilities" className="max-w-[1200px] mx-auto px-6 py-20 border-b border-white/[0.07]">
          <div className="max-w-xl mb-12">
            <h2 className="text-2xl font-semibold tracking-tight text-[#F4F4F6]">
              Engineered for polyglot teams
            </h2>
            <p className="mt-2.5 text-[15px] text-[#9494A3]">
              Every project stays independent of a single language so algorithms, services, and
              frontends live under one structured roof.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 rounded-xl bg-[#0B0B0F] border border-white/[0.07] p-7 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-[#111116] border border-white/[0.08] flex items-center justify-center mb-5">
                  <FolderTree className="w-4 h-4 text-[#F4F4F6]" strokeWidth={1.5} />
                </div>
                <h3 className="text-[17px] font-semibold text-[#F4F4F6] tracking-tight">
                  01. Language-Independent Projects
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#9494A3] max-w-lg">
                  Create a project with only a name, organize folders freely, and assign the
                  programming language per file. Syntax highlighting and runtime selection follow
                  each file automatically.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-white/[0.07] flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[12px] text-[#9494A3]">
                <span>JavaScript</span>
                <span className="text-[#5C5C6E]">·</span>
                <span>Python</span>
                <span className="text-[#5C5C6E]">·</span>
                <span>C++</span>
                <span className="text-[#5C5C6E]">·</span>
                <span>Java</span>
                <span className="text-[#5C5C6E]">·</span>
                <span>HTML</span>
                <span className="text-[#5C5C6E]">·</span>
                <span>CSS</span>
              </div>
            </div>

            <div className="rounded-xl bg-[#0B0B0F] border border-white/[0.07] p-7">
              <div className="w-9 h-9 rounded-lg bg-[#111116] border border-white/[0.08] flex items-center justify-center mb-5">
                <Users className="w-4 h-4 text-[#F4F4F6]" strokeWidth={1.5} />
              </div>
              <h3 className="text-[17px] font-semibold text-[#F4F4F6] tracking-tight">
                02. Live Cursor Tracking
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#9494A3]">
                Inspect collaborator cursors and text selections in real time as multiple editors
                modify the same source file simultaneously.
              </p>
            </div>

            <div className="rounded-xl bg-[#0B0B0F] border border-white/[0.07] p-7">
              <div className="w-9 h-9 rounded-lg bg-[#111116] border border-white/[0.08] flex items-center justify-center mb-5">
                <Terminal className="w-4 h-4 text-[#F4F4F6]" strokeWidth={1.5} />
              </div>
              <h3 className="text-[17px] font-semibold text-[#F4F4F6] tracking-tight">
                03. Instant Execution & Terminal
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#9494A3]">
                Run any supported file in one click, inspect stdout and stderr, run commands in the
                integrated terminal, and audit execution history.
              </p>
            </div>

            <div className="md:col-span-2 rounded-xl bg-[#0B0B0F] border border-white/[0.07] p-7 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-[#111116] border border-white/[0.08] flex items-center justify-center mb-5">
                  <Shield className="w-4 h-4 text-[#F4F4F6]" strokeWidth={1.5} />
                </div>
                <h3 className="text-[17px] font-semibold text-[#F4F4F6] tracking-tight">
                  04. Strict Role-Based Access Control
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#9494A3] max-w-lg">
                  Project Owners retain full governance over collaborators and project naming,
                  Editors write and execute code, and Viewers inspect source files in strict
                  read-only mode.
                </p>
              </div>
              <div id="permissions" className="mt-6 pt-5 border-t border-white/[0.07] grid grid-cols-3 gap-4 text-[12px]">
                <div>
                  <p className="font-medium text-[#F4F4F6]">Owner</p>
                  <p className="text-[#9494A3] mt-0.5">Edit, run, rename &amp; manage access</p>
                </div>
                <div>
                  <p className="font-medium text-[#F4F4F6]">Editor</p>
                  <p className="text-[#9494A3] mt-0.5">Edit files, folders &amp; execute code</p>
                </div>
                <div>
                  <p className="font-medium text-[#F4F4F6]">Viewer</p>
                  <p className="text-[#9494A3] mt-0.5">Strict read-only source inspection</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Summary Strip */}
        <section id="workflow" className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[#F4F4F6]">
                Ready to open the IDE?
              </h2>
              <p className="mt-1 text-[14px] text-[#9494A3]">
                Explore pre-populated multi-language projects or create your own immediately.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenDemo}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5E5CE6] hover:bg-[#4F46E5] text-[#F4F4F6] text-[13px] font-medium transition-mechanical whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Code2 className="w-4 h-4" strokeWidth={1.5} />
                <span>Launch AlgoLab Demo</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.07] py-6">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#5C5C6E]">
          <div className="flex items-center gap-2">
            <BrandLogo size={16} />
            <span className="text-[#9494A3] font-medium">DevSync</span>
            <span aria-hidden="true">·</span>
            <span>Collaborative Browser Development Platform</span>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={onGetStarted}
              className="hover:text-[#F4F4F6] transition-mechanical cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onOpenDemo}
              className="hover:text-[#F4F4F6] transition-mechanical cursor-pointer"
            >
              Demo Workspace
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
