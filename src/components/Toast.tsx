import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  text: string;
  variant: ToastVariant;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none no-print"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const icon =
          toast.variant === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : toast.variant === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
          );

        const borderClass =
          toast.variant === 'success'
            ? 'border-emerald-200 bg-white'
            : toast.variant === 'error'
              ? 'border-red-200 bg-white'
              : 'border-slate-200 bg-white';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm text-slate-800 ${borderClass}`}
          >
            <div className="mt-0.5">{icon}</div>
            <p className="flex-1 leading-snug">{toast.text}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
