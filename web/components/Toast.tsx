"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (options: { type?: ToastType; title: string; message?: string }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = "info", title, message }: { type?: ToastType; title: string; message?: string }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, type, title, message };
      setToasts((prev) => [...prev.slice(-3), newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => addToast({ type: "success", title, message }), [addToast]);
  const error = useCallback((title: string, message?: string) => addToast({ type: "error", title, message }), [addToast]);
  const info = useCallback((title: string, message?: string) => addToast({ type: "info", title, message }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
          maxWidth: 380,
          width: "calc(100% - 48px)",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass"
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 14,
              border: `1px solid ${
                t.type === "success"
                  ? "rgba(16, 185, 129, 0.4)"
                  : t.type === "error"
                  ? "rgba(239, 68, 68, 0.4)"
                  : "rgba(6, 182, 212, 0.4)"
              }`,
              background: "rgba(13, 16, 26, 0.95)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
              animation: "fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              {t.type === "success" && <CheckCircle2 size={18} color="#34d399" />}
              {t.type === "error" && <AlertTriangle size={18} color="#f87171" />}
              {t.type === "info" && <Info size={18} color="#38bdf8" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#fff" }}>{t.title}</div>
              {t.message && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>
                  {t.message}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 2,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
