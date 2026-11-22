import { Link } from 'react-router-dom';
import type { Project } from '../../types';
import { RoleBadge } from '../ui/Badge';
import { CalendarIcon, ArchiveIcon, ArrowRightIcon, RefreshCwIcon } from '../icons';

interface ProjectCardProps {
  project: Project;
  onRestore: (id: string) => Promise<void>;
  restoring?: boolean;
}

export function ProjectCard({ project, onRestore, restoring = false }: ProjectCardProps) {
  const role = project.members[0]?.role ?? 'MEMBER';
  const isArchived = Boolean(project.archivedAt);
  const initial = project.name.trim().slice(0, 1).toUpperCase();

  return (
    <article className={`tf-project-card ${isArchived ? 'tf-project-card-archived' : ''}`}>
      <div className="tf-project-card-top">
        <div className="tf-project-monogram">{initial}</div>
        <div className="tf-project-card-badges">
          {isArchived ? (
            <span className="tf-badge tf-badge-warning">
              <ArchiveIcon size={12} />
              Đã lưu trữ
            </span>
          ) : (
            <RoleBadge role={role} />
          )}
        </div>
      </div>

      <div className="tf-project-card-body">
        <h3 className="tf-project-card-title">{project.name}</h3>
        <p className="tf-project-card-desc">
          {project.description || 'Chưa có mô tả cho dự án này.'}
        </p>
      </div>

      <div className="tf-project-card-footer">
        <div className="tf-project-meta">
          <CalendarIcon size={14} />
          <span>Tạo ngày {new Date(project.createdAt).toLocaleDateString('vi-VN')}</span>
        </div>

        <div className="tf-project-card-cta">
          {isArchived ? (
            <button
              type="button"
              className="tf-button tf-button-outline tf-button-sm tf-button-wide"
              onClick={() => void onRestore(project.id)}
              disabled={restoring}
            >
              <RefreshCwIcon size={14} className={restoring ? 'animate-spin' : ''} />
              <span>{restoring ? 'Đang khôi phục...' : 'Khôi phục dự án'}</span>
            </button>
          ) : (
            <Link
              to={`/projects/${project.id}`}
              className="tf-button tf-button-outline tf-button-sm tf-button-wide"
            >
              <span>Mở dự án</span>
              <ArrowRightIcon size={14} />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
