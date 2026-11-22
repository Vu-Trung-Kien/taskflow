import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangleIcon } from '../icons';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="tf-confirm-content">
        <div className={`tf-confirm-icon tf-confirm-icon-${variant}`}>
          <AlertTriangleIcon size={24} />
        </div>
        <div className="tf-confirm-text">
          <h3 className="tf-confirm-title">{title}</h3>
          <p className="tf-confirm-message">{message}</p>
        </div>
      </div>
      <div className="tf-confirm-actions">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
