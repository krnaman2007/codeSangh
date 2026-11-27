import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { ApiClientError } from '../api/errors';
import { sanitizeReturnUrl, useAuth } from '../state/authStore';
import { useUiStore } from '../state/uiStore';
import { BrandLogo } from './BrandMark';
import { FormField, GlassButton, GlassPanel, TextInput } from './ui';

interface AuthViewProps {
  initialMode: 'login' | 'register';
}

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

function validateName(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return 'Name must be between 2 and 50 characters.';
  }
  return undefined;
}

function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address.';
  }
  return undefined;
}

function validatePassword(value: string, mode: 'login' | 'register'): string | undefined {
  if (!value) {
    return 'Password is required.';
  }
  if (mode === 'register') {
    if (value.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (value.length > 72) {
      return 'Password cannot exceed 72 characters.';
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(value)) {
      return 'Password must include at least one letter and one number.';
    }
  }
  return undefined;
}

export function AuthView({ initialMode }: AuthViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, sessionExpired, clearSessionExpired } = useAuth();
  const { pushToast } = useUiStore();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; password?: boolean }>(
    {}
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setFieldErrors({});
    setFormError(null);
    setTouched({});
  }, [initialMode]);

  const searchParams = new URLSearchParams(location.search);
  const returnTo = sanitizeReturnUrl(searchParams.get('returnTo'));

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setFieldErrors({});
    setFormError(null);
    setTouched({});
    const targetPath = nextMode === 'login' ? '/login' : '/register';
    navigate(`${targetPath}${location.search}`, { replace: true });
  };

  const handleBlur = (field: keyof FieldErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'name' && mode === 'register') {
      setFieldErrors((prev) => ({ ...prev, name: validateName(name) }));
    } else if (field === 'email') {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else if (field === 'password') {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(password, mode) }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearSessionExpired();

    const nextErrors: FieldErrors = {
      name: mode === 'register' ? validateName(name) : undefined,
      email: validateEmail(email),
      password: validatePassword(password, mode),
    };

    setFieldErrors(nextErrors);
    setTouched({ name: true, email: true, password: true });

    if (nextErrors.name) {
      nameRef.current?.focus();
      return;
    }
    if (nextErrors.email) {
      emailRef.current?.focus();
      return;
    }
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const authenticatedUser =
        mode === 'login'
          ? await login({ email: email.trim(), password })
          : await register({ name: name.trim(), email: email.trim(), password });

      pushToast(
        mode === 'login'
          ? `Signed in as ${authenticatedUser.name}`
          : `Welcome to DevSync, ${authenticatedUser.name}`,
        'success'
      );
      navigate(returnTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors((prev) => ({
            ...prev,
            name: err.fieldErrors.name ?? prev.name,
            email: err.fieldErrors.email ?? prev.email,
            password: err.fieldErrors.password ?? prev.password,
          }));
        }
        if (err.code === 'EMAIL_TAKEN') {
          setFieldErrors((prev) => ({ ...prev, email: err.userMessage }));
          emailRef.current?.focus();
        } else {
          setFormError(err.userMessage);
        }
      } else {
        setFormError('Unable to complete authentication. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] bg-dot-grid text-[var(--text-primary)] flex flex-col justify-between p-6">
      <header className="max-w-[1200px] w-full mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-mechanical"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span>Back to DevSync</span>
        </Link>
        <Link
          to="/demo"
          className="text-[12px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-mechanical"
        >
          Live Demo
        </Link>
      </header>

      <main className="w-full max-w-[420px] mx-auto my-auto py-8">
        <GlassPanel variant="elevated" className="p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <BrandLogo size={22} />
            <span className="text-[16px] font-semibold tracking-tight text-[var(--text-primary)]">
              DevSync
            </span>
          </div>

          {sessionExpired && (
            <div
              role="status"
              className="mb-5 flex items-start gap-2.5 rounded-lg bg-[var(--state-warning-bg)] border border-[var(--state-warning-border)] px-3 py-2.5 text-[12px] text-[#fde047]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>Your session expired. Sign in again to continue where you left off.</span>
            </div>
          )}

          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 p-1 rounded-lg bg-[var(--surface-base)] border border-[var(--border-hairline)] mb-6"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => switchMode('login')}
              className={`py-1.5 text-[13px] font-medium rounded-md transition-mechanical cursor-pointer ${
                mode === 'login'
                  ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => switchMode('register')}
              className={`py-1.5 text-[13px] font-medium rounded-md transition-mechanical cursor-pointer ${
                mode === 'register'
                  ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Create Account
            </button>
          </div>

          <h1 className="text-[20px] font-semibold tracking-tight text-[var(--text-primary)]">
            {mode === 'login' ? 'Welcome back' : 'Create your developer account'}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1 mb-5">
            {mode === 'login'
              ? 'Sign in to access your owned and shared workspaces.'
              : 'Start building multi-language collaborative projects in the browser.'}
          </p>

          <form onSubmit={handleSubmit} method="post" noValidate className="space-y-4">
            {mode === 'register' && (
              <FormField
                id="auth-name"
                label="Full Name"
                required
                error={fieldErrors.name}
                hint="2 to 50 characters"
              >
                <TextInput
                  ref={nameRef}
                  id="auth-name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setName(val);
                    if (fieldErrors.name && !validateName(val)) {
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  onBlur={() => {
                    if (name || touched.name) handleBlur('name');
                  }}
                  placeholder="Alex Rivera"
                  autoComplete="name"
                  enterKeyHint="next"
                  hasError={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'auth-name-error' : 'auth-name-hint'}
                  leadingIcon={<User className="w-4 h-4" strokeWidth={1.5} />}
                  required
                />
              </FormField>
            )}

            <FormField id="auth-email" label="Email Address" required error={fieldErrors.email}>
              <TextInput
                ref={emailRef}
                id="auth-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  const val = e.target.value;
                  setEmail(val);
                  if (fieldErrors.email && !validateEmail(val)) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                onBlur={() => {
                  if (email || touched.email) handleBlur('email');
                }}
                placeholder="developer@company.com"
                autoComplete="email"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="next"
                hasError={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
                leadingIcon={<Mail className="w-4 h-4" strokeWidth={1.5} />}
                required
              />
            </FormField>

            <FormField
              id="auth-password"
              label="Password"
              required
              error={fieldErrors.password}
              hint={
                mode === 'register'
                  ? 'At least 8 characters with 1 letter and 1 number'
                  : undefined
              }
            >
              <TextInput
                ref={passwordRef}
                id="auth-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  const val = e.target.value;
                  setPassword(val);
                  if (fieldErrors.password && !validatePassword(val, mode)) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                onBlur={() => {
                  if (password || touched.password) handleBlur('password');
                }}
                placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter your password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                enterKeyHint="done"
                hasError={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password
                    ? 'auth-password-error'
                    : mode === 'register'
                    ? 'auth-password-hint'
                    : undefined
                }
                leadingIcon={<Lock className="w-4 h-4" strokeWidth={1.5} />}
                trailingAction={
                  <button
                    type="button"
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-mechanical cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={1.5} />
                    )}
                  </button>
                }
                required
              />
            </FormField>

            {formError && (
              <p
                role="alert"
                className="text-[12px] text-[#fca5a5] bg-[var(--state-danger-bg)] border border-[var(--state-danger-border)] rounded-lg px-3 py-2"
              >
                {formError}
              </p>
            )}

            <GlassButton
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              className="w-full h-10"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                  <span>{mode === 'login' ? 'Signing In…' : 'Creating Account…'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </>
              )}
            </GlassButton>
          </form>

          <div className="mt-5 pt-5 border-t border-[var(--border-hairline)] flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
            <span>Prefer to explore without signing in?</span>
            <Link
              to="/demo"
              className="font-medium text-[#a5b4fc] hover:text-[var(--text-primary)] transition-mechanical"
            >
              Open Demo
            </Link>
          </div>
        </GlassPanel>
      </main>

      <footer className="text-center text-[12px] text-[var(--text-muted)]">
        Authenticated sessions sync across your browser with secure refresh cookies.
      </footer>
    </div>
  );
}
