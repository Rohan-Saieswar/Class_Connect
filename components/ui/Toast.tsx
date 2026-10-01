
"use client";
import { useState, useCallback } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let counter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++counter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}

const ICONS = {
  success: <CheckCircle size={16} className="text-emerald-400" />,
  error:   <XCircle size={16} className="text-red-400" />,
  info:    <Info size={16} className="text-blue-400" />,
};

interface ToastContainerProps {
  toasts: Toast[];
  dismiss: (id: number) => void;
}

export function ToastContainer({ toasts, dismiss }: ToastContainerProps) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[280px] animate-slide-up"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-medium)" }}
        >
          {ICONS[t.type]}
          <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{t.message}</span>
          <button onClick={() => dismiss(t.id)} style={{ color: "var(--text-muted)" }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
