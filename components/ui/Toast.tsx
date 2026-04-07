"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  action?: ToastAction;
  exiting?: boolean;
}

interface ToastContextValue {
  showToast: (opts: { message: string; action?: ToastAction; duration?: number }) => number;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => 0,
  dismissToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    // Start exit animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const showToast = useCallback(
    ({ message, action, duration = 3000 }: { message: string; action?: ToastAction; duration?: number }) => {
      const id = ++counterRef.current;
      setToasts((prev) => [...prev, { id, message, action }]);
      if (duration > 0) {
        setTimeout(() => dismissToast(id), duration);
      }
      return id;
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const show = visible && !toast.exiting;

  return (
    <div
      className="pointer-events-auto flex items-center gap-4 rounded-xl px-5 py-3 shadow-lg transition-all duration-200"
      style={{
        background: "#2d2520",
        color: "#fff",
        fontFamily: "Outfit, sans-serif",
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(12px)",
        minWidth: 260,
      }}
    >
      <span className="text-sm">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            onDismiss();
          }}
          className="text-sm font-semibold shrink-0 hover:opacity-80 transition-opacity"
          style={{ color: "#d4a96a", background: "none", border: "none", cursor: "pointer" }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}

export const useToast = () => useContext(ToastContext);
