import { useEffect, useState, useMemo } from 'react';
import { projectApi, ApiError } from '../api';
import type { Project } from '../types';
import { AppLayout } from '../components/layout/AppLayout';
import { ProjectCard } from '../components/projects/ProjectCard';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { EmptyState } from '../components/ui/EmptyState';
import {
  FolderPlusIcon,
  PlusIcon,
  SearchIcon,
  ArchiveIcon,
  FolderIcon,
  Loader2Icon,
  AlertCircleIcon,
} from '../components/icons';
import { Button } from '../components/ui/Button';

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function loadProjects() {
    setLoading(true);
    setError('');
    try {
      const data = await projectApi.list(true);
      setProjects(data);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function handleRestore(projectId: string) {
    setError('');
    setRestoringId(projectId);
    try {
      await projectApi.restore(projectId);
      await loadProjects();
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setRestoringId(null);
    }
  }

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return projects.filter((project) =>
      Boolean(project.archivedAt) === showArchived &&
      (!query ||
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)),
    );
  }, [projects, searchQuery, showArchived]);

  return (
    <AppLayout
      includeArchived={showArchived}
      onToggleArchived={setShowArchived}
      onOpenCreateProject={() => setCreateModalOpen(true)}
      breadcrumbs={<span className="tf-breadcrumb-current">Dự án của bạn</span>}
    >
      <main className="tf-page-container">
        {/* Page Header */}
        <div className="tf-page-header">
          <div className="tf-page-header-content">
            <span className="tf-eyebrow">KHÔNG GIAN LÀM VIỆC</span>
            <h1 className="tf-page-title">
              {showArchived ? 'Dự án đã lưu trữ' : 'Dự án của bạn'}
            </h1>
            <p className="tf-page-subtitle">
              {showArchived
                ? 'Các dự án đã hoàn thành hoặc tạm dừng lưu trữ. Bạn có thể khôi phục lại bất kỳ lúc nào.'
                : 'Tập hợp toàn bộ công việc, tài liệu và tiến độ cộng tác của đội ngũ ở cùng một nơi.'}
            </p>
          </div>

          <div className="tf-page-header-actions">
            <label className="tf-toggle-pill">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              <ArchiveIcon size={15} />
              <span>Hiện dự án đã lưu trữ</span>
            </label>

            {!showArchived && (
              <Button
                variant="primary"
                icon={<PlusIcon size={16} />}
                onClick={() => setCreateModalOpen(true)}
              >
                Tạo dự án mới
              </Button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="tf-toolbar-row">
          <div className="tf-search-wrapper">
            <SearchIcon size={16} className="tf-search-icon" />
            <input
              type="text"
              className="tf-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm dự án theo tên hoặc mô tả..."
            />
            {searchQuery && (
              <button
                type="button"
                className="tf-search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="tf-count-badge">
            {filteredProjects.length} dự án
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="tf-alert tf-alert-error" role="alert">
            <AlertCircleIcon size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Projects Grid */}
        {loading ? (
          <div className="tf-loading-state">
            <Loader2Icon size={32} className="animate-spin tf-text-primary" />
            <p>Đang tải danh sách không gian làm việc...</p>
          </div>
        ) : (
          <div className="tf-project-grid">
            {/* Create Project Interactive Card (in primary view) */}
            {!showArchived && !searchQuery && (
              <div
                className="tf-project-create-card"
                onClick={() => setCreateModalOpen(true)}
                role="button"
                tabIndex={0}
              >
                <div className="tf-create-card-icon">
                  <FolderPlusIcon size={28} />
                </div>
                <h3>Tạo dự án mới</h3>
                <p>Khởi tạo không gian làm việc mới để bắt đầu lên kế hoạch và phân công nhiệm vụ.</p>
                <span className="tf-create-card-link">
                  <PlusIcon size={16} /> Bắt đầu ngay
                </span>
              </div>
            )}

            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onRestore={handleRestore}
                restoring={restoringId === project.id}
              />
            ))}

            {filteredProjects.length === 0 && (
              <div className="tf-grid-full-width">
                {searchQuery ? (
                  <EmptyState
                    icon={<SearchIcon size={32} />}
                    title="Không tìm thấy dự án phù hợp"
                    description={`Không có dự án nào khớp với từ khóa "${searchQuery}". Hãy thử tìm kiếm bằng từ khóa khác.`}
                    action={
                      <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                        Xóa tìm kiếm
                      </Button>
                    }
                  />
                ) : showArchived ? (
                  <EmptyState
                    icon={<ArchiveIcon size={32} />}
                    title="Kho lưu trữ trống"
                    description="Hiện tại không có dự án nào bị lưu trữ."
                  />
                ) : (
                  <EmptyState
                    icon={<FolderIcon size={32} />}
                    title="Chưa có dự án nào"
                    description="Tạo dự án đầu tiên để bắt đầu sắp xếp công việc và cộng tác cùng nhóm."
                    action={
                      <Button
                        variant="primary"
                        icon={<PlusIcon size={16} />}
                        onClick={() => setCreateModalOpen(true)}
                      >
                        Tạo dự án đầu tiên
                      </Button>
                    }
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Create Project Modal */}
        <CreateProjectModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onCreated={loadProjects}
        />
      </main>
    </AppLayout>
  );
}
