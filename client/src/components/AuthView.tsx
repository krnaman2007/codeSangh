import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Lock, Mail, User } from 'lucide-react';
import type { UserAccount } from '../types/devsync';
import { DEMO_USER } from '../data/seedProjects';
import { BrandLogo } from './BrandMark';

interface AuthViewProps {
  onAuthenticated: (user: UserAccount) => void;
  onBackToLanding: () => void;
}

export function AuthView({ onAuthenticated, onBackToLanding }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (mode === 'register' && name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid developer email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const displayName =
      mode === 'register'
        ? name.trim()
        : trimmedEmail.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const parts = displayName.split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : displayName.slice(0, 2).toUpperCase();

    onAuthenticated({
      id: `usr-${trimmedEmail.toLowerCase()}`,
      name: displayName,
      email: trimmedEmail,
      initials,
    });
  };

  return (
    <div className="min-h-screen bg-[#050507] bg-dot-grid text-[#F4F4F6] flex flex-col justify-between p-6">
      <div className="max-w-[1200px] w-full mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-[13px] text-[#9494A3] hover:text-[#F4F4F6] transition-mechanical cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>Back to DevSync</span>
        </button>
      </div>

      <main className="w-full max-w-[400px] mx-auto my-auto py-8">
        <div className="rounded-xl bg-[#111116]/75 backdrop-blur-xl border border-white/10 p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <BrandLogo size={22} />
            <span className="text-[16px] font-semibold tracking-tight text-[#F4F4F6]">
              DevSync
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 p-1 rounded-lg bg-[#0B0B0F] border border-white/[0.07] mb-6"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-1.5 text-[13px] font-medium rounded-md transition-mechanical cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#18181F] text-[#F4F4F6]'
                  : 'text-[#9494A3] hover:text-[#F4F4F6]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-1.5 text-[13px] font-medium rounded-md transition-mechanical cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#18181F] text-[#F4F4F6]'
                  : 'text-[#9494A3] hover:text-[#F4F4F6]'
              }`}
            >
              Create Account
            </button>
          </div>

          <h1 className="text-[20px] font-semibold tracking-tight text-[#F4F4F6]">
            {mode === 'login' ? 'Welcome back' : 'Create your developer account'}
          </h1>
          <p className="text-[13px] text-[#9494A3] mt-1 mb-5">
            {mode === 'login'
              ? 'Sign in to access your owned and shared workspaces.'
              : 'Start building multi-language collaborative projects in the browser.'}
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-[12px] font-medium text-[#9494A3] mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User
                    className="w-4 h-4 text-[#5C5C6E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    strokeWidth={1.5}
                  />
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    autoComplete="name"
                    className="w-full rounded-lg bg-[#0B0B0F] border border-white/[0.08] pl-9 pr-3 py-2 text-[13px] text-[#F4F4F6] placeholder-[#5C5C6E] focus:outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6] transition-mechanical"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-[12px] font-medium text-[#9494A3] mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-[#5C5C6E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  strokeWidth={1.5}
                />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@company.com"
                  autoComplete="email"
                  className="w-full rounded-lg bg-[#0B0B0F] border border-white/[0.08] pl-9 pr-3 py-2 text-[13px] text-[#F4F4F6] placeholder-[#5C5C6E] focus:outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6] transition-mechanical"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-[12px] font-medium text-[#9494A3] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-[#5C5C6E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  strokeWidth={1.5}
                />
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full rounded-lg bg-[#0B0B0F] border border-white/[0.08] pl-9 pr-3 py-2 text-[13px] text-[#F4F4F6] placeholder-[#5C5C6E] focus:outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6] transition-mechanical"
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="text-[12px] text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-lg px-3 py-2"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#5E5CE6] hover:bg-[#4F46E5] text-[#F4F4F6] text-[13px] font-medium py-2.5 px-4 transition-mechanical cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5E5CE6]"
            >
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.07]" />
            </div>
            <div className="relative flex justify-center text-[11px] text-[#5C5C6E]">
              <span className="bg-[#111116] px-2.5">or instant access</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAuthenticated(DEMO_USER)}
            className="w-full rounded-lg bg-[#18181F] hover:bg-[#20202A] border border-white/[0.08] text-[#F4F4F6] text-[13px] font-medium py-2.5 px-4 transition-mechanical cursor-pointer"
          >
            Continue with Demo Account
          </button>
        </div>
      </main>

      <div className="text-center text-[12px] text-[#5C5C6E]">
        Projects, folders, files, and language settings persist locally across sessions.
      </div>
    </div>
  );
}
