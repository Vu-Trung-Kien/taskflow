import { useEffect, type ReactNode } from 'react';
import { XIcon } from '../icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="tf-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`tf-modal-container tf-modal-${maxWidth}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tf-modal-header">
          <div>
            {title && <h2 className="tf-modal-title">{title}</h2>}
            {description && <p className="tf-modal-description">{description}</p>}
          </div>
          <button
            type="button"
            className="tf-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <XIcon size={18} />
          </button>
        </div>
        <div className="tf-modal-body">{children}</div>
      </div>
    </div>
  );
}
