import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { projectApi, taskApi, ApiError } from '../api';
import { useAuth } from '../auth';
import type { Project, ProjectMember, Task, TaskStatus } from '../types';
import { AppLayout } from '../components/layout/AppLayout';
import { ProjectHeader } from '../components/workspace/ProjectHeader';
import { WorkspaceTabs, type WorkspaceTab } from '../components/workspace/WorkspaceTabs';
import { KanbanBoard } from '../components/tasks/KanbanBoard';
import { TaskRow } from '../components/tasks/TaskRow';
import { TaskCreateForm } from '../components/tasks/TaskCreateForm';
import { TaskDetailsPanel } from '../components/tasks/TaskDetailsPanel';
import { DashboardPanel } from '../components/dashboard/DashboardPanel';
import { MembersPanel } from '../components/members/MembersPanel';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import {
  KanbanIcon,
  ListIcon,
  FilterIcon,
  DownloadIcon,
  TrashIcon,
  PlusIcon,
  Loader2Icon,
  AlertCircleIcon,
  CheckCircleIcon,
} from '../components/icons';

export const statusLabels: Record<TaskStatus, string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  DONE: 'Hoàn tất',
  BLOCKED: 'Bị chặn',
};

export const priorityLabels = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
};

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}

export function WorkspacePage() {
  const { projectId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<(Project & { members: ProjectMember[] }) | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [tab, setTab] = useState<WorkspaceTab>('tasks');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [quickAddStatus, setQuickAddStatus] = useState<TaskStatus | null>(null);

  const role = useMemo(
    () => members.find((member) => member.userId === user?.id)?.role ?? 'VIEWER',
    [members, user?.id],
  );
  const canEdit = role === 'OWNER' || role === 'MEMBER';
  const canManage = role === 'OWNER';

  async function loadWorkspace() {
    setLoading(true);
    setError('');
    try {
      const [nextProject, nextMembers, nextTasks] = await Promise.all([
        projectApi.get(projectId),
        projectApi.members(projectId),
        taskApi.list(projectId, {
          status: status || undefined,
          priority: priority || undefined,
          includeDeleted: showDeleted,
        }),
      ]);
      setProject(nextProject);
      setMembers(nextMembers);
      setTasks(nextTasks);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, [projectId, status, priority, showDeleted]);

  async function refreshTasks() {
    try {
      setTasks(
        await taskApi.list(projectId, {
          status: status || undefined,
          priority: priority || undefined,
          includeDeleted: showDeleted,
        }),
      );
      if (selectedTask && !showDeleted) {
        const refreshed = await taskApi.get(projectId, selectedTask.id);
        setSelectedTask(refreshed);
      }
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function handleKanbanDrop(taskId: string, targetStatus: TaskStatus, targetPosition?: number) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.status === targetStatus && targetPosition !== undefined && task.position === targetPosition) return;

    const newPosition = targetPosition ?? task.position;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus, position: newPosition } : t)),
    );
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, status: targetStatus, position: newPosition } : null));
    }

    try {
      await taskApi.update(projectId, taskId, {
        status: targetStatus,
        ...(targetPosition !== undefined ? { position: targetPosition } : {}),
      });
    } catch (requestError) {
      setError(messageOf(requestError));
      await refreshTasks();
    }
  }

  async function handleArchiveProject() {
    setError('');
    try {
      await projectApi.archive(projectId);
      navigate('/projects');
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function handleExportCsv() {
    setExporting(true);
    setError('');
    try {
      const blob = await taskApi.exportCsv(projectId, {
        status: status || undefined,
        priority: priority || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      const projectSlug =
        project?.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'tasks';
      link.download = `taskflow-${projectSlug}-${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setExporting(false);
    }
  }

  if (loading && !project) {
    return (
      <AppLayout>
        <div className="tf-loading-state">
          <Loader2Icon size={32} className="animate-spin tf-text-primary" />
          <p>Đang tải không gian làm việc dự án...</p>
        </div>
      </AppLayout>
    );
  }

  if (error && !project) {
    return (
      <AppLayout>
        <main className="tf-page-container">
          <div className="tf-alert tf-alert-error" role="alert">
            <AlertCircleIcon size={18} />
            <span>{error}</span>
          </div>
          <Link to="/projects" className="tf-button tf-button-outline">
            ← Quay lại danh sách dự án
          </Link>
        </main>
      </AppLayout>
    );
  }

  if (!project) return null;

  return (
    <AppLayout
      activeProjectId={project.id}
      projectName={project.name}
      breadcrumbs={
        <div className="tf-breadcrumb-chain">
          <Link to="/projects" className="tf-breadcrumb-link">
            Dự án
          </Link>
          <span className="tf-breadcrumb-separator">/</span>
          <span className="tf-breadcrumb-active">{project.name}</span>
        </div>
      }
    >
      <main className="tf-workspace-container">
        {/* Project Header Info */}
        <ProjectHeader
          project={project}
          userRole={role}
          canManage={canManage}
          onRefresh={loadWorkspace}
          onArchive={handleArchiveProject}
        />

        {error && (
          <div className="tf-alert tf-alert-error" role="alert">
            <AlertCircleIcon size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Workspace Navigation Tabs */}
        <WorkspaceTabs
          activeTab={tab}
          onChangeTab={setTab}
          tasksCount={tasks.length}
          membersCount={members.length}
        />

        {/* Tab 1: Tasks */}
        {tab === 'tasks' && (
          <section className="tf-tasks-view-wrapper">
            <div className="tf-tasks-main-column">
              {/* Task Toolbar */}
              <div className="tf-tasks-toolbar">
                <div className="tf-tasks-toolbar-title">
                  <h2>{showDeleted ? 'Thùng rác (Đã xóa)' : 'Danh sách công việc'}</h2>
                  <p className="tf-text-muted">
                    {showDeleted
                      ? 'Xem và khôi phục các công việc đã bị xóa tạm thời.'
                      : 'Kéo thả thẻ công việc để cập nhật trạng thái hoặc chuyển sang danh sách.'}
                  </p>
                </div>

                <div className="tf-tasks-controls">
                  {!showDeleted && (
                    <div className="tf-segmented-toggle" role="group" aria-label="Chế độ hiển thị">
                      <button
                        type="button"
                        className={`tf-segment-btn ${viewMode === 'kanban' ? 'active' : ''}`}
                        onClick={() => setViewMode('kanban')}
                        title="Chế độ xem bảng kéo-thả Kanban"
                      >
                        <KanbanIcon size={15} />
                        <span>Bảng Kanban</span>
                      </button>
                      <button
                        type="button"
                        className={`tf-segment-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                        title="Chế độ xem bảng danh sách dọc"
                      >
                        <ListIcon size={15} />
                        <span>Danh sách</span>
                      </button>
                    </div>
                  )}

                  {/* Status Filter */}
                  <div className="tf-filter-select-wrap">
                    <FilterIcon size={13} className="tf-filter-icon" />
                    <select
                      aria-label="Lọc trạng thái"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="tf-select tf-select-sm"
                    >
                      <option value="">Tất cả trạng thái</option>
                      {Object.entries(statusLabels).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div className="tf-filter-select-wrap">
                    <select
                      aria-label="Lọc mức ưu tiên"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="tf-select tf-select-sm"
                    >
                      <option value="">Mọi mức độ ưu tiên</option>
                      {Object.entries(priorityLabels).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Export CSV */}
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<DownloadIcon size={14} />}
                    onClick={() => void handleExportCsv()}
                    loading={exporting}
                    title="Xuất công việc ra file CSV"
                  >
                    Xuất CSV
                  </Button>

                  {/* Deleted Toggle */}
                  {canEdit && (
                    <label className={`tf-trash-toggle-btn ${showDeleted ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={showDeleted}
                        onChange={(e) => {
                          setShowDeleted(e.target.checked);
                          setSelectedTask(null);
                        }}
                      />
                      <TrashIcon size={14} />
                      <span>Thùng rác</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Task Create Inline Card */}
              {canEdit && !showDeleted && (
                <TaskCreateForm
                  projectId={projectId}
                  members={members}
                  onCreated={refreshTasks}
                  defaultStatus={quickAddStatus || 'TODO'}
                />
              )}

              {/* Loading Indicator */}
              {loading && (
                <div className="tf-tasks-loading-inline">
                  <Loader2Icon size={20} className="animate-spin tf-text-primary" />
                  <span>Đang cập nhật danh sách công việc...</span>
                </div>
              )}

              {/* Empty State */}
              {!loading && tasks.length === 0 && (
                <EmptyState
                  icon={showDeleted ? <TrashIcon size={36} /> : <CheckCircleIcon size={36} />}
                  title={showDeleted ? 'Thùng rác trống' : 'Chưa có công việc nào'}
                  description={
                    showDeleted
                      ? 'Các công việc đã xóa mềm sẽ xuất hiện tại đây nếu có.'
                      : status || priority
                      ? 'Không có công việc nào phù hợp với bộ lọc hiện tại.'
                      : 'Hãy tạo công việc đầu tiên để bắt đầu phân công và theo dõi tiến độ.'
                  }
                  action={
                    !showDeleted && canEdit ? (
                      <Button
                        variant="primary"
                        icon={<PlusIcon size={16} />}
                        onClick={() => setQuickAddStatus('TODO')}
                      >
                        Tạo công việc ngay
                      </Button>
                    ) : undefined
                  }
                />
              )}

              {/* Kanban View */}
              {!loading && tasks.length > 0 && viewMode === 'kanban' && !showDeleted && (
                <KanbanBoard
                  tasks={tasks.filter((task) => !task.parentTaskId)}
                  canEdit={canEdit}
                  selectedTaskId={selectedTask?.id}
                  onSelectTask={setSelectedTask}
                  onDropStatus={handleKanbanDrop}
                  onQuickAdd={(targetStatus) => setQuickAddStatus(targetStatus)}
                />
              )}

              {/* List View */}
              {!loading && (viewMode === 'list' || showDeleted) && tasks.length > 0 && (
                <div className="tf-task-list-view">
                  <div className="tf-task-list-header">
                    <span className="tf-list-header-status">Trạng thái</span>
                    <span className="tf-list-header-title">Tiêu đề & Mô tả</span>
                    <span className="tf-list-header-priority">Ưu tiên</span>
                    <span className="tf-list-header-assignee">Người phụ trách</span>
                    <span className="tf-list-header-due">Hạn chót</span>
                    {showDeleted && <span className="tf-list-header-actions">Thao tác</span>}
                  </div>
                  <div className="tf-task-list-body">
                    {tasks
                      .filter((task) => showDeleted || !task.parentTaskId)
                      .map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          selected={selectedTask?.id === task.id}
                          deleted={showDeleted}
                          canEdit={canEdit}
                          onSelect={() => setSelectedTask(task)}
                          onChanged={refreshTasks}
                          projectId={projectId}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Task Details Side Panel */}
            {selectedTask && !showDeleted && (
              <TaskDetailsPanel
                key={selectedTask.id}
                task={selectedTask}
                projectId={projectId}
                currentUserId={user?.id ?? ''}
                canEdit={canEdit}
                isOwner={canManage}
                members={members}
                onClose={() => setSelectedTask(null)}
                onOpenTask={setSelectedTask}
                onChanged={refreshTasks}
              />
            )}
          </section>
        )}

        {/* Tab 2: Dashboard */}
        {tab === 'dashboard' && (
          <DashboardPanel
            projectId={projectId}
            onNavigateToTasks={(filters) => {
              if (filters?.status !== undefined) setStatus(filters.status);
              if (filters?.priority !== undefined) setPriority(filters.priority);
              setTab('tasks');
            }}
            onExportCsv={handleExportCsv}
            exporting={exporting}
          />
        )}

        {/* Tab 3: Members */}
        {tab === 'members' && (
          <MembersPanel
            projectId={projectId}
            members={members}
            currentUserId={user?.id ?? ''}
            canManage={canManage}
            onChanged={loadWorkspace}
          />
        )}
      </main>
    </AppLayout>
  );
}
