'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = '480px',
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="glass w-full fade-in"
        style={{ maxWidth, maxHeight: '85vh', overflow: 'auto' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)]">
          {title && (
            <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors ml-auto"
          >
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
