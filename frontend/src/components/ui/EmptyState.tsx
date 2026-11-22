import type { ReactNode } from 'react';
import { SparklesIcon } from '../icons';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = <SparklesIcon size={32} />,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`tf-empty-state ${className}`}>
      <div className="tf-empty-icon">{icon}</div>
      <h3 className="tf-empty-title">{title}</h3>
      {description && <p className="tf-empty-desc">{description}</p>}
      {action && <div className="tf-empty-action">{action}</div>}
    </div>
  );
}
