import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { ToastMessage } from '../types/devsync';

interface UiContextValue {
  toasts: ToastMessage[];
  pushToast: (title: string, variant?: ToastMessage['variant'], description?: string) => void;
  dismissToast: (id: string) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (title: string, variant: ToastMessage['variant'] = 'info', description?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, title, description, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3800);
    },
    []
  );

  return (
    <UiContext.Provider
      value={{
        toasts,
        pushToast,
        dismissToast,
        commandPaletteOpen,
        setCommandPaletteOpen,
      }}
    >
      {children}
    </UiContext.Provider>
  );
}

export function useUiStore(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) {
    throw new Error('useUiStore must be used within UiProvider');
  }
  return ctx;
}
