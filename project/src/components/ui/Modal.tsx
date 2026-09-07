import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-md' }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${maxWidth} bg-surface-card rounded-t-3xl sm:rounded-3xl shadow-card-hover max-h-[90vh] overflow-y-auto scrollbar-hide animate-slide-up`}
      >
        {title && (
          <div className="sticky top-0 bg-surface-card border-b border-line px-5 py-4 flex items-center justify-between z-10">
            <h3 className="text-lg font-bold text-ink">{title}</h3>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:bg-surface-alt transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
