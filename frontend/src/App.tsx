import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ApiError, authApi, collaborationApi, projectApi, taskApi, uploadFile } from './api';
import { useAuth } from './auth';
import type {
  Attachment,
  Comment,
  Project,
  ProjectMember,
  ProjectMetrics,
  ProjectRole,
  Task,
  TaskPriority,
  TaskStatus,
} from './types';

const statusLabels: Record<TaskStatus, string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  DONE: 'Hoàn tất',
  BLOCKED: 'Bị chặn',
};
const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
};
const roleLabels: Record<ProjectRole, string> = {
  OWNER: 'Chủ dự án',
  MEMBER: 'Thành viên',
  VIEWER: 'Người xem',
};

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}

function Loading({ label = 'Đang tải...' }: { label?: string }) {
  return <div className="loading"><span className="spinner" />{label}</div>;
}

function Guarded({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading label="Đang khôi phục phiên làm việc" />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading label="Đang khôi phục phiên làm việc" />;
  return user ? <Navigate to="/projects" replace /> : <>{children}</>;
}

function AuthPage({ register = false }: { register?: boolean }) {
  const { signIn, sessionError } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = register
        ? await authApi.register(
            String(form.get('name') ?? ''),
            String(form.get('email') ?? ''),
            String(form.get('password') ?? ''),
          )
        : await authApi.login(
            String(form.get('email') ?? ''),
            String(form.get('password') ?? ''),
          );
      signIn(result.user, result.accessToken);
      navigate('/projects', { replace: true });
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-aside">
        <Link to="/login" className="brand brand-light"><span className="brand-mark">T</span> taskflow</Link>
        <div className="auth-pitch">
          <span className="eyebrow">CÙNG NHAU LÀM ĐƯỢC NHIỀU HƠN</span>
          <h1>Mọi dự án.<br />Một nhịp làm việc.</h1>
          <p>Lên kế hoạch rõ ràng, phối hợp liền mạch và đưa công việc tiến về phía trước.</p>
          <div className="pitch-checks">
            <span>✓ Theo dõi tiến độ theo nhóm</span>
            <span>✓ Tập trung vào điều quan trọng</span>
            <span>✓ Cộng tác trong từng công việc</span>
          </div>
        </div>
        <span className="aside-foot">TaskFlow · Không gian làm việc của bạn</span>
      </section>
      <section className="auth-main">
        <div className="auth-card">
          <span className="eyebrow">{register ? 'BẮT ĐẦU MIỄN PHÍ' : 'CHÀO MỪNG TRỞ LẠI'}</span>
          <h2>{register ? 'Tạo tài khoản' : 'Đăng nhập'}</h2>
          <p className="muted">{register ? 'Tạo tài khoản để bắt đầu tổ chức công việc.' : 'Đăng nhập để tiếp tục công việc của bạn.'}</p>
          {sessionError && <div className="alert alert-error" role="alert">Không thể khôi phục phiên trước đó: {sessionError}</div>}
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <form className="stack-form" onSubmit={submit}>
            {register && (
              <label>
                Tên hiển thị
                <input name="name" autoComplete="name" minLength={1} maxLength={100} required placeholder="Tên của bạn" />
              </label>
            )}
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required placeholder="ban@congty.com" />
            </label>
            <label>
              Mật khẩu
              <input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 12 : 1} maxLength={128} required placeholder={register ? 'Ít nhất 12 ký tự' : 'Nhập mật khẩu'} />
            </label>
            <button className="button button-primary button-wide" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : register ? 'Tạo tài khoản' : 'Đăng nhập'}
            </button>
          </form>
          <div className="auth-switch">
            {register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
            <Link to={register ? '/login' : '/register'}>{register ? 'Đăng nhập' : 'Tạo tài khoản'}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function AppFrame({ children }: { children: React.ReactNode }) {
  const { user, signOut, sessionError } = useAuth();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState('');

  async function logout() {
    setSignOutError('');
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      setSignOutError(messageOf(error));
    }
  }

  return (
    <div className="app-frame">
      <header className="topbar">
        <Link to="/projects" className="brand"><span className="brand-mark">T</span> taskflow</Link>
        <div className="topbar-right">
          <span className="avatar">{(user?.name ?? user?.email ?? 'U').slice(0, 1).toUpperCase()}</span>
          <span className="user-label">{user?.name || user?.email}</span>
          <button className="button button-quiet" onClick={() => void logout()}>Đăng xuất</button>
        </div>
      </header>
      {sessionError && <div className="global-notice" role="alert">Không thể khôi phục phiên trước đó: {sessionError}</div>}
      {signOutError && <div className="global-notice" role="alert">{signOutError}</div>}
      {children}
    </div>
  );
}

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setProjects(await projectApi.list(includeArchived));
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [includeArchived]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    try {
      await projectApi.create({
        name: String(form.get('name') ?? ''),
        description: String(form.get('description') ?? ''),
      });
      formElement.reset();
      await load();
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function restore(projectId: string) {
    setError('');
    try {
      await projectApi.restore(projectId);
      await load();
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  return (
    <AppFrame>
      <main className="page-container">
        <div className="page-heading">
          <div>
            <span className="eyebrow">KHÔNG GIAN LÀM VIỆC</span>
            <h1>Dự án của bạn</h1>
            <p className="muted">Tập hợp công việc và cộng tác của bạn, ở cùng một nơi.</p>
          </div>
          <label className="toggle-label"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /> Hiện dự án đã lưu trữ</label>
        </div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <section className="project-grid">
          {!includeArchived && (
            <article className="project-card create-card">
              <div className="card-icon">＋</div>
              <h2>Tạo dự án mới</h2>
              <p className="muted">Bắt đầu với một không gian làm việc mới.</p>
              <form className="stack-form" onSubmit={createProject}>
                <label>Tên dự án<input name="name" maxLength={120} required placeholder="Ví dụ: Ra mắt sản phẩm" /></label>
                <label>Mô tả <span className="optional">Không bắt buộc</span><textarea name="description" maxLength={10000} rows={3} placeholder="Mục tiêu hoặc bối cảnh dự án..." /></label>
                <button className="button button-primary" disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo dự án'}</button>
              </form>
            </article>
          )}
          {loading ? <div className="project-loading"><Loading label="Đang tải dự án" /></div> : projects.map((project) => {
            const role = project.members[0]?.role;
            return (
              <article key={project.id} className={`project-card ${project.archivedAt ? 'project-card-archived' : ''}`}>
                <div className="project-card-top">
                  <div className="card-icon card-icon-purple">{project.name.trim().slice(0, 1).toUpperCase()}</div>
                  {project.archivedAt && <span className="tag">Đã lưu trữ</span>}
                </div>
                <h2>{project.name}</h2>
                <p className="project-description">{project.description || 'Chưa có mô tả cho dự án này.'}</p>
                <div className="project-meta"><span className="role-pill">{role ? roleLabels[role] : 'Thành viên'}</span><span>Tạo ngày {new Date(project.createdAt).toLocaleDateString('vi-VN')}</span></div>
                {project.archivedAt
                  ? <button className="button button-outline button-wide" onClick={() => void restore(project.id)}>Khôi phục dự án</button>
                  : <Link className="button button-outline button-wide" to={`/projects/${project.id}`}>Mở dự án <span>→</span></Link>}
              </article>
            );
          })}
          {!loading && projects.length === 0 && includeArchived && <div className="empty-card">Không có dự án đã lưu trữ.</div>}
        </section>
      </main>
    </AppFrame>
  );
}

function WorkspacePage() {
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
  const [tab, setTab] = useState<'tasks' | 'dashboard' | 'members'>('tasks');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

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
        taskApi.list(projectId, { status: status || undefined, priority: priority || undefined, includeDeleted: showDeleted }),
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

  useEffect(() => { void loadWorkspace(); }, [projectId, status, priority, showDeleted]);

  async function refreshTasks() {
    try {
      setTasks(await taskApi.list(projectId, { status: status || undefined, priority: priority || undefined, includeDeleted: showDeleted }));
      if (selectedTask && !showDeleted) {
        const refreshed = await taskApi.get(projectId, selectedTask.id);
        setSelectedTask(refreshed);
      }
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function archiveProject() {
    if (!project || !window.confirm(`Lưu trữ dự án “${project.name}”?`)) return;
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
      const projectSlug = project?.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'tasks';
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

  if (loading && !project) return <AppFrame><Loading label="Đang tải không gian dự án" /></AppFrame>;
  if (error && !project) return <AppFrame><main className="page-container"><div className="alert alert-error">{error}</div><Link to="/projects" className="button button-outline">← Về danh sách dự án</Link></main></AppFrame>;
  if (!project) return null;

  return (
    <AppFrame>
      <main className="workspace-container">
        <div className="breadcrumb"><Link to="/projects">Dự án</Link><span>/</span><span>{project.name}</span></div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <section className="workspace-heading">
          <div className="workspace-project-icon">{project.name.slice(0, 1).toUpperCase()}</div>
          <div className="workspace-title">
            <span className="eyebrow">DỰ ÁN</span>
            {canManage ? <ProjectSettings project={project} onSaved={loadWorkspace} /> : <h1>{project.name}</h1>}
            <p className="muted">{project.description || 'Không có mô tả dự án.'}</p>
          </div>
          <div className="workspace-actions">
            {canManage && <button className="button button-quiet" onClick={() => void archiveProject()}>Lưu trữ</button>}
            <span className="role-pill">{roleLabels[role]}</span>
          </div>
        </section>
        <div className="workspace-tabs">
          <button className={tab === 'tasks' ? 'tab active' : 'tab'} onClick={() => setTab('tasks')}>Công việc <span className="count">{tasks.length}</span></button>
          <button className={tab === 'dashboard' ? 'tab active' : 'tab'} onClick={() => setTab('dashboard')}>Tổng quan (Dashboard)</button>
          <button className={tab === 'members' ? 'tab active' : 'tab'} onClick={() => setTab('members')}>Thành viên <span className="count">{members.length}</span></button>
        </div>
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
        {tab === 'tasks' && (
          <section className="task-layout">
            <div className="task-column">
              <div className="task-toolbar">
                <div>
                  <h2>{showDeleted ? 'Đã xóa' : 'Tất cả công việc'}</h2>
                  <p className="muted">{showDeleted ? 'Khôi phục công việc đã xóa mềm.' : 'Theo dõi tiến độ của nhóm.'}</p>
                </div>
                <div className="toolbar-controls">
                  <select aria-label="Lọc trạng thái" value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="">Mọi trạng thái</option>
                    {Object.entries(statusLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                  </select>
                  <select aria-label="Lọc mức ưu tiên" value={priority} onChange={(event) => setPriority(event.target.value)}>
                    <option value="">Mọi mức độ</option>
                    {Object.entries(priorityLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                  </select>
                  <button
                    type="button"
                    className="button button-outline button-small"
                    onClick={() => void handleExportCsv()}
                    disabled={exporting}
                    title="Xuất danh sách công việc sang file CSV"
                  >
                    {exporting ? 'Đang xuất...' : '📥 Xuất CSV'}
                  </button>
                  {canEdit && <label className="toggle-label compact"><input type="checkbox" checked={showDeleted} onChange={(event) => { setShowDeleted(event.target.checked); setSelectedTask(null); }} /> Đã xóa</label>}
                </div>
              </div>
              {canEdit && !showDeleted && <TaskCreateForm projectId={projectId} members={members} onCreated={refreshTasks} />}
              <div className="task-list">
                {loading && <Loading label="Đang cập nhật công việc" />}
                {!loading && tasks.length === 0 && <div className="empty-state"><span className="empty-icon">✓</span><strong>{showDeleted ? 'Thùng rác trống' : 'Chưa có công việc nào'}</strong><span>{showDeleted ? 'Các công việc đã xóa sẽ xuất hiện tại đây.' : 'Tạo công việc đầu tiên để bắt đầu.'}</span></div>}
                {tasks.filter((task) => showDeleted || !task.parentTaskId).map((task) => (
                  <TaskRow key={task.id} task={task} selected={selectedTask?.id === task.id} deleted={showDeleted} canEdit={canEdit} onSelect={() => setSelectedTask(task)} onChanged={refreshTasks} projectId={projectId} />
                ))}
              </div>
            </div>
            {selectedTask && !showDeleted && (
              <TaskPanel
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
        {tab === 'members' && (
          <MembersPanel projectId={projectId} members={members} currentUserId={user?.id ?? ''} canManage={canManage} onChanged={loadWorkspace} />
        )}
      </main>
    </AppFrame>
  );
}

function DashboardPanel({
  projectId,
  onNavigateToTasks,
  onExportCsv,
  exporting = false,
}: {
  projectId: string;
  onNavigateToTasks: (filters?: { status?: string; priority?: string }) => void;
  onExportCsv?: () => Promise<void>;
  exporting?: boolean;
}) {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadMetrics() {
    setLoading(true);
    setError('');
    try {
      const data = await projectApi.metrics(projectId);
      setMetrics(data);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMetrics();
  }, [projectId]);

  if (loading && !metrics) {
    return <div className="dashboard-loading"><Loading label="Đang tải dữ liệu thống kê..." /></div>;
  }

  if (error && !metrics) {
    return (
      <div className="alert alert-error">
        {error}
        <button
          className="button button-small button-outline"
          onClick={() => void loadMetrics()}
          style={{ marginLeft: '1rem' }}
          type="button"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  const { tasks, members, activity } = metrics;
  const total = tasks.total;

  return (
    <section className="dashboard-layout">
      <div className="dashboard-header">
        <div>
          <h2>Tổng quan dự án</h2>
          <p className="muted">Số liệu thống kê tiến độ, phân bổ công việc và hoạt động của nhóm.</p>
        </div>
        <div className="button-row">
          {onExportCsv && (
            <button
              className="button button-outline button-small"
              onClick={() => void onExportCsv()}
              disabled={exporting}
              type="button"
              title="Xuất danh sách công việc sang file CSV"
            >
              {exporting ? 'Đang xuất...' : '📥 Xuất CSV'}
            </button>
          )}
          <button
            className="button button-outline button-small"
            onClick={() => void loadMetrics()}
            disabled={loading}
            type="button"
          >
            {loading ? 'Đang cập nhật...' : '↻ Làm mới số liệu'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon metric-icon-blue">📋</div>
          <div className="metric-body">
            <span className="metric-label">Tổng công việc</span>
            <strong className="metric-value">{tasks.total}</strong>
            <span className="metric-hint">Đang hoạt động</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon metric-icon-green">✅</div>
          <div className="metric-body">
            <span className="metric-label">Đã hoàn thành</span>
            <strong className="metric-value">{tasks.byStatus.DONE}</strong>
            <span className="metric-hint text-success">{tasks.completionRate}% hoàn tất</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon metric-icon-purple">⏳</div>
          <div className="metric-body">
            <span className="metric-label">Đang thực hiện</span>
            <strong className="metric-value">{tasks.byStatus.IN_PROGRESS}</strong>
            <span className="metric-hint">{tasks.byStatus.TODO} việc cần làm</span>
          </div>
        </div>

        <div className={`metric-card ${tasks.overdue > 0 ? 'metric-card-alert' : ''}`}>
          <div className="metric-icon metric-icon-red">⚠️</div>
          <div className="metric-body">
            <span className="metric-label">Công việc quá hạn</span>
            <strong className={`metric-value ${tasks.overdue > 0 ? 'danger-text' : ''}`}>
              {tasks.overdue}
            </strong>
            <span className="metric-hint">{tasks.dueSoon} việc tới hạn trong 7 ngày</span>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <h3>Tiến độ tổng thể dự án</h3>
          <span className="progress-badge">{tasks.completionRate}%</span>
        </div>
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill progress-fill-green"
            style={{ width: `${Math.min(100, Math.max(0, tasks.completionRate))}%` }}
          />
        </div>
        <div className="progress-stats-row">
          <span>{tasks.byStatus.DONE} / {tasks.total} công việc đã hoàn thành</span>
          {tasks.byStatus.BLOCKED > 0 && (
            <span className="danger-text">⛔ {tasks.byStatus.BLOCKED} việc đang bị chặn</span>
          )}
        </div>
      </div>

      <div className="dashboard-two-col">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Phân bố theo trạng thái</h3>
            <span className="muted small-text">Bấm để lọc công việc</span>
          </div>
          <div className="breakdown-list">
            {(['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'] as TaskStatus[]).map((st) => {
              const count = tasks.byStatus[st] ?? 0;
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <button
                  key={st}
                  type="button"
                  className="breakdown-item-button"
                  onClick={() => onNavigateToTasks({ status: st, priority: '' })}
                  title={`Lọc công việc ${statusLabels[st]}`}
                >
                  <div className="breakdown-item-top">
                    <span className="status-badge-text">{statusLabels[st]}</span>
                    <strong>{count} <span className="muted font-normal">({percent}%)</span></strong>
                  </div>
                  <div className="sub-progress-bar">
                    <div
                      className={`sub-progress-fill status-fill-${st.toLowerCase().replace('_', '-')}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3>Mức độ ưu tiên</h3>
            <span className="muted small-text">Bấm để lọc công việc</span>
          </div>
          <div className="breakdown-list">
            {(['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as TaskPriority[]).map((pr) => {
              const count = tasks.byPriority[pr] ?? 0;
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <button
                  key={pr}
                  type="button"
                  className="breakdown-item-button"
                  onClick={() => onNavigateToTasks({ status: '', priority: pr })}
                  title={`Lọc công việc mức ${priorityLabels[pr]}`}
                >
                  <div className="breakdown-item-top">
                    <span className={`priority-badge priority-${pr.toLowerCase()}`}>{priorityLabels[pr]}</span>
                    <strong>{count} <span className="muted font-normal">({percent}%)</span></strong>
                  </div>
                  <div className="sub-progress-bar">
                    <div
                      className={`sub-progress-fill priority-fill-${pr.toLowerCase()}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <h3>Phân bổ công việc theo thành viên ({members.total})</h3>
          <div className="activity-summary-tags">
            <span className="activity-tag">💬 {activity.totalComments} bình luận</span>
            <span className="activity-tag">📎 {activity.totalAttachments} tệp đính kèm</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="workload-table">
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Vai trò</th>
                <th className="text-center">Được giao</th>
                <th className="text-center">Đã xong</th>
                <th className="text-center">Quá hạn</th>
                <th className="text-right">Tỷ lệ hoàn thành</th>
              </tr>
            </thead>
            <tbody>
              {members.breakdown.map((m) => {
                const completion = m.assignedTasks > 0
                  ? Math.round((m.completedTasks / m.assignedTasks) * 100)
                  : 0;
                return (
                  <tr key={m.userId}>
                    <td>
                      <div className="user-cell">
                        <span className="avatar avatar-small">
                          {(m.name || m.email).slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <strong>{m.name || m.email}</strong>
                          {m.name && <span className="user-subtext">{m.email}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="role-pill">{roleLabels[m.role]}</span>
                    </td>
                    <td className="text-center font-semibold">{m.assignedTasks}</td>
                    <td className="text-center text-success font-semibold">{m.completedTasks}</td>
                    <td className="text-center">
                      {m.overdueTasks > 0 ? (
                        <span className="badge-danger">{m.overdueTasks}</span>
                      ) : (
                        <span className="muted">0</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="member-progress-cell">
                        <span className="member-percent-text">{m.assignedTasks > 0 ? `${completion}%` : '—'}</span>
                        {m.assignedTasks > 0 && (
                          <div className="mini-progress-bar">
                            <div
                              className="mini-progress-fill"
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ProjectSettings({ project, onSaved }: { project: Project; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await projectApi.update(project.id, { name: String(form.get('name') ?? ''), description: String(form.get('description') ?? '') });
      setEditing(false);
      await onSaved();
    } catch (requestError) { setError(messageOf(requestError)); }
    finally { setSaving(false); }
  }
  if (!editing) return <div className="title-with-edit"><h1>{project.name}</h1><button className="icon-button" aria-label="Chỉnh sửa dự án" onClick={() => setEditing(true)}>✎</button>{error && <span className="inline-error">{error}</span>}</div>;
  return <form className="project-edit-form" onSubmit={save}>
    <input name="name" maxLength={120} defaultValue={project.name} aria-label="Tên dự án" required />
    <textarea name="description" rows={2} maxLength={10000} defaultValue={project.description ?? ''} aria-label="Mô tả dự án" />
    {error && <span className="inline-error">{error}</span>}
    <div className="button-row"><button className="button button-primary button-small" disabled={saving}>Lưu</button><button type="button" className="button button-quiet button-small" onClick={() => setEditing(false)}>Hủy</button></div>
  </form>;
}

function MembersPanel({ projectId, members, currentUserId, canManage, onChanged }: { projectId: string; members: ProjectMember[]; currentUserId: string; canManage: boolean; onChanged: () => Promise<void> }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    try {
      await projectApi.addMember(projectId, String(form.get('email') ?? ''), String(form.get('role') ?? 'MEMBER') as 'MEMBER' | 'VIEWER');
      formElement.reset();
      await onChanged();
    } catch (requestError) { setError(messageOf(requestError)); }
    finally { setSaving(false); }
  }

  async function mutate(action: () => Promise<unknown>) {
    setError('');
    try { await action(); await onChanged(); }
    catch (requestError) { setError(messageOf(requestError)); }
  }

  return (
    <section className="members-section">
      <div className="section-heading"><div><h2>Thành viên dự án</h2><p className="muted">Quản lý quyền truy cập và vai trò trong nhóm.</p></div><span className="count">{members.length} người</span></div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="member-list">
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          return (
            <div className="member-row" key={member.userId}>
              <span className="avatar avatar-large">{(member.user.name ?? member.user.email).slice(0, 1).toUpperCase()}</span>
              <div className="member-info"><strong>{member.user.name || member.user.email}{isSelf && <span className="muted"> · Bạn</span>}</strong><span>{member.user.email}</span></div>
              {canManage && member.role !== 'OWNER' ? (
                <div className="member-controls">
                  <select aria-label={`Vai trò ${member.user.email}`} value={member.role} onChange={(event) => void mutate(() => projectApi.updateMember(projectId, member.userId, event.target.value as 'MEMBER' | 'VIEWER'))}>
                    <option value="MEMBER">Thành viên</option><option value="VIEWER">Người xem</option>
                  </select>
                  <button className="button button-quiet danger-text" onClick={() => {
                    if (window.confirm(`Xóa ${member.user.name || member.user.email} khỏi dự án?`)) void mutate(() => projectApi.removeMember(projectId, member.userId));
                  }}>Xóa</button>
                  <button className="button button-quiet" onClick={() => {
                    if (window.confirm(`Chuyển quyền chủ dự án cho ${member.user.name || member.user.email}?`)) void mutate(() => projectApi.transferOwner(projectId, member.userId));
                  }}>Chuyển quyền</button>
                </div>
              ) : <span className={`role-pill role-${member.role.toLowerCase()}`}>{roleLabels[member.role]}</span>}
            </div>
          );
        })}
      </div>
      {canManage && <form className="add-member-form" onSubmit={addMember}>
        <div><h3>Mời thành viên</h3><p className="muted">Chỉ tài khoản đã đăng ký mới có thể được thêm.</p></div>
        <div className="add-member-controls"><input type="email" name="email" required placeholder="Email thành viên" /><select name="role" defaultValue="MEMBER"><option value="MEMBER">Thành viên</option><option value="VIEWER">Người xem</option></select><button className="button button-primary" disabled={saving}>{saving ? 'Đang thêm...' : 'Thêm thành viên'}</button></div>
      </form>}
    </section>
  );
}

function TaskCreateForm({ projectId, members, onCreated }: { projectId: string; members: ProjectMember[]; onCreated: () => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    try {
      await taskApi.create(projectId, {
        title: String(form.get('title') ?? ''),
        description: String(form.get('description') ?? '') || undefined,
        status: String(form.get('status') ?? 'TODO'),
        priority: String(form.get('priority') ?? 'MEDIUM'),
        assigneeId: String(form.get('assigneeId') ?? '') || undefined,
        dueAt: String(form.get('dueAt') ?? '') ? new Date(`${String(form.get('dueAt'))}T00:00:00.000Z`).toISOString() : undefined,
      });
      formElement.reset();
      setExpanded(false);
      await onCreated();
    } catch (requestError) { setError(messageOf(requestError)); }
    finally { setSaving(false); }
  }
  return (
    <div className="task-create">
      {!expanded ? <button className="button button-primary" onClick={() => setExpanded(true)}>＋ Tạo công việc</button> : (
        <form className="task-create-form" onSubmit={submit}>
          <input name="title" autoFocus maxLength={200} required placeholder="Tên công việc..." />
          <div className="form-grid">
            <select name="priority" defaultValue="MEDIUM" aria-label="Mức ưu tiên">{Object.entries(priorityLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select>
            <select name="status" defaultValue="TODO" aria-label="Trạng thái">{Object.entries(statusLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select>
            <select name="assigneeId" defaultValue="" aria-label="Người thực hiện"><option value="">Chưa giao</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name || member.user.email}</option>)}</select>
            <input name="dueAt" type="date" aria-label="Hạn hoàn thành" />
          </div>
          <textarea name="description" maxLength={10000} rows={2} placeholder="Mô tả công việc (không bắt buộc)" />
          {error && <div className="inline-error">{error}</div>}
          <div className="button-row"><button className="button button-primary button-small" disabled={saving}>{saving ? 'Đang tạo...' : 'Lưu công việc'}</button><button type="button" className="button button-quiet button-small" onClick={() => { setExpanded(false); setError(''); }}>Hủy</button></div>
        </form>
      )}
    </div>
  );
}

function TaskRow({ task, selected, deleted, canEdit, onSelect, onChanged, projectId }: { task: Task; selected: boolean; deleted: boolean; canEdit: boolean; onSelect: () => void; onChanged: () => Promise<void>; projectId: string }) {
  const [error, setError] = useState('');
  async function restore() {
    setError('');
    try { await taskApi.restore(projectId, task.id); await onChanged(); }
    catch (requestError) { setError(messageOf(requestError)); }
  }
  return (
    <article className={`task-row ${selected ? 'task-row-selected' : ''} ${deleted ? 'task-row-deleted' : ''}`}>
      <button className="task-row-main" onClick={onSelect} disabled={deleted}>
        <span className={`status-dot status-${task.status.toLowerCase()}`} />
        <span className="task-row-content"><strong>{task.title}</strong><span>{task.parentTaskId ? 'Công việc con' : task.description || 'Chưa có mô tả'}</span></span>
        <span className={`priority priority-${task.priority.toLowerCase()}`}>{priorityLabels[task.priority]}</span>
        <span className="task-assignee">{task.assignee?.name || task.assignee?.email || 'Chưa giao'}</span>
        <span className={`status-label status-label-${task.status.toLowerCase()}`}>{statusLabels[task.status]}</span>
      </button>
      {task.dueAt && <span className="task-due">{new Date(task.dueAt).toLocaleDateString('vi-VN')}</span>}
      {deleted && canEdit && <button className="button button-quiet button-small" onClick={() => void restore()}>Khôi phục</button>}
      {error && <span className="inline-error">{error}</span>}
    </article>
  );
}

function TaskPanel({ task: initialTask, projectId, currentUserId, canEdit, isOwner, members, onClose, onOpenTask, onChanged }: { task: Task; projectId: string; currentUserId: string; canEdit: boolean; isOwner: boolean; members: ProjectMember[]; onClose: () => void; onOpenTask: (task: Task) => void; onChanged: () => Promise<void> }) {
  const [task, setTask] = useState(initialTask);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [editingTask, setEditingTask] = useState(false);
  const [taskFormError, setTaskFormError] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [savingSubtask, setSavingSubtask] = useState(false);

  async function loadDetails() {
    setError('');
    try {
      const [nextTask, nextComments, nextAttachments] = await Promise.all([
        taskApi.get(projectId, task.id),
        collaborationApi.comments(projectId, task.id),
        collaborationApi.attachments(projectId, task.id),
      ]);
      setTask(nextTask);
      setComments(nextComments);
      setAttachments(nextAttachments);
    } catch (requestError) { setError(messageOf(requestError)); }
  }
  useEffect(() => { void loadDetails(); }, [projectId, task.id]);

  async function updateTask(input: Record<string, unknown>) {
    setError('');
    try {
      const updated = await taskApi.update(projectId, task.id, input);
      setTask(updated);
      await onChanged();
    } catch (requestError) { setError(messageOf(requestError)); }
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      await collaborationApi.createComment(projectId, task.id, commentBody);
      setCommentBody('');
      await loadDetails();
    } catch (requestError) { setError(messageOf(requestError)); }
  }

  async function saveComment(commentId: string) {
    setError('');
    try {
      await collaborationApi.updateComment(projectId, task.id, commentId, editingBody);
      setEditingCommentId(null);
      await loadDetails();
    } catch (requestError) { setError(messageOf(requestError)); }
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm('Xóa bình luận này?')) return;
    setError('');
    try {
      await collaborationApi.deleteComment(projectId, task.id, commentId);
      await loadDetails();
    } catch (requestError) { setError(messageOf(requestError)); }
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setError('');
    if (file.size > 10 * 1024 * 1024) {
      setError('Tệp đính kèm không được vượt quá 10 MiB.');
      return;
    }
    if (!file.type) {
      setError('Không xác định được loại tệp. Hãy chọn tệp có MIME type được hỗ trợ.');
      return;
    }
    setUploading(true);
    let pendingAttachmentId: string | null = null;
    try {
      const result = await collaborationApi.createAttachment(projectId, task.id, file);
      pendingAttachmentId = result.attachment.id;
      try {
        await uploadFile(result.uploadUrl, file);
      } catch (uploadError) {
        try {
          await collaborationApi.deleteAttachment(projectId, task.id, pendingAttachmentId);
          pendingAttachmentId = null;
        } catch (cleanupError) {
          throw new Error(`${messageOf(uploadError)} Không thể dọn metadata upload: ${messageOf(cleanupError)}`, { cause: uploadError });
        }
        throw uploadError;
      }
      await collaborationApi.completeAttachment(projectId, task.id, result.attachment.id);
      await loadDetails();
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setUploading(false);
    }
  }

  async function download(attachmentId: string) {
    setError('');
    try {
      const result = await collaborationApi.downloadUrl(projectId, task.id, attachmentId);
      window.location.assign(result.downloadUrl);
    } catch (requestError) { setError(messageOf(requestError)); }
  }

  async function deleteAttachment(attachment: Attachment) {
    if (!window.confirm(`Xóa tệp “${attachment.fileName}”?`)) return;
    setError('');
    try {
      await collaborationApi.deleteAttachment(projectId, task.id, attachment.id);
      await loadDetails();
    } catch (requestError) { setError(messageOf(requestError)); }
  }

  async function createSubtask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSavingSubtask(true);
    try {
      await taskApi.create(projectId, { title: subtaskTitle, parentTaskId: task.id });
      setSubtaskTitle('');
      await loadDetails();
      await onChanged();
    } catch (requestError) { setError(messageOf(requestError)); }
    finally { setSavingSubtask(false); }
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setTaskFormError('');
    const form = new FormData(event.currentTarget);
    try {
      const updated = await taskApi.update(projectId, task.id, {
        title: String(form.get('title') ?? ''),
        description: String(form.get('description') ?? '') || null,
      });
      setTask(updated);
      setEditingTask(false);
      await onChanged();
    } catch (requestError) {
      setTaskFormError(messageOf(requestError));
    }
  }

  async function deleteTask() {
    if (!window.confirm(`Xóa “${task.title}”? Công việc có thể được khôi phục sau đó.`)) return;
    setError('');
    try { await taskApi.delete(projectId, task.id); onClose(); await onChanged(); }
    catch (requestError) { setError(messageOf(requestError)); }
  }

  return (
    <aside className="task-panel">
      <div className="task-panel-header"><span className="eyebrow">CHI TIẾT CÔNG VIỆC</span><button className="icon-button" aria-label="Đóng chi tiết" onClick={onClose}>×</button></div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {editingTask ? <form className="task-edit-form" onSubmit={(event) => void saveTask(event)}>
        <label>Tiêu đề<input name="title" defaultValue={task.title} maxLength={200} required /></label>
        <label>Mô tả<textarea name="description" defaultValue={task.description ?? ''} maxLength={10000} rows={3} /></label>
        {taskFormError && <div className="inline-error">{taskFormError}</div>}
        <div className="button-row"><button className="button button-primary button-small">Lưu thay đổi</button><button type="button" className="button button-quiet button-small" onClick={() => setEditingTask(false)}>Hủy</button></div>
      </form> : <>
        <div className="task-panel-title"><span className={`status-dot status-${task.status.toLowerCase()}`} /><h2>{task.title}</h2>{canEdit && <button className="icon-button" aria-label="Chỉnh sửa công việc" onClick={() => setEditingTask(true)}>✎</button>}</div>
        <p className="task-panel-description">{task.description || 'Chưa có mô tả.'}</p>
      </>}
      <div className="task-properties">
        <label>Trạng thái<select disabled={!canEdit} value={task.status} onChange={(event) => void updateTask({ status: event.target.value })}>{Object.entries(statusLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
        <label>Ưu tiên<select disabled={!canEdit} value={task.priority} onChange={(event) => void updateTask({ priority: event.target.value })}>{Object.entries(priorityLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
        <label>Người thực hiện<select disabled={!canEdit} value={task.assigneeId ?? ''} onChange={(event) => void updateTask({ assigneeId: event.target.value || null })}><option value="">Chưa giao</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name || member.user.email}</option>)}</select></label>
        <label>Hạn hoàn thành<input disabled={!canEdit} type="date" value={task.dueAt ? task.dueAt.slice(0, 10) : ''} onChange={(event) => void updateTask({ dueAt: event.target.value ? new Date(`${event.target.value}T00:00:00.000Z`).toISOString() : null })} /></label>
      </div>
      {canEdit && !task.parentTaskId && <section className="panel-section">
        <div className="panel-section-heading"><h3>Công việc con</h3><span className="count">{task.subTasks?.length ?? 0}</span></div>
        <div className="subtask-list">{task.subTasks?.map((subtask) => <div className="subtask-row" key={subtask.id}><input aria-label={`Hoàn thành ${subtask.title}`} type="checkbox" checked={subtask.status === 'DONE'} onChange={(event) => void updateSubtask(projectId, subtask, event.target.checked, setError, loadDetails, onChanged)} /><button type="button" className="subtask-link" onClick={() => onOpenTask(subtask)}>{subtask.title}</button><button type="button" className="text-button" onClick={() => void updateSubtask(projectId, subtask, false, setError, loadDetails, onChanged, true)}>Xóa</button></div>)}</div>
        <form className="inline-add-form" onSubmit={(event) => void createSubtask(event)}><input value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} maxLength={200} required placeholder="Thêm công việc con..." /><button className="button button-outline button-small" disabled={savingSubtask}>Thêm</button></form>
      </section>}
      <section className="panel-section">
        <div className="panel-section-heading"><h3>Bình luận</h3><span className="count">{comments.length}</span></div>
        <div className="comment-list">
          {comments.map((comment) => {
            const canManageComment = comment.authorId === currentUserId || isOwner;
            return <article className="comment" key={comment.id}>
              <span className="avatar avatar-small">{(comment.author.name || comment.author.email).slice(0, 1).toUpperCase()}</span>
              <div className="comment-content">
                <div className="comment-meta"><strong>{comment.author.name || comment.author.email}</strong><time>{new Date(comment.createdAt).toLocaleString('vi-VN')}</time></div>
                {editingCommentId === comment.id ? <div className="stack-form"><textarea value={editingBody} onChange={(event) => setEditingBody(event.target.value)} maxLength={5000} rows={3} /><div className="button-row"><button className="button button-primary button-small" onClick={() => void saveComment(comment.id)}>Lưu</button><button className="button button-quiet button-small" onClick={() => setEditingCommentId(null)}>Hủy</button></div></div> : <p>{comment.body}</p>}
                {canManageComment && editingCommentId !== comment.id && <div className="comment-actions"><button className="text-button" onClick={() => { setEditingCommentId(comment.id); setEditingBody(comment.body); }}>Sửa</button><button className="text-button danger-text" onClick={() => void deleteComment(comment.id)}>Xóa</button></div>}
              </div>
            </article>;
          })}
          {comments.length === 0 && <p className="muted small-text">Chưa có bình luận. Hãy bắt đầu cuộc trò chuyện.</p>}
        </div>
        {canEdit && <form className="comment-form" onSubmit={(event) => void addComment(event)}><textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} maxLength={5000} rows={3} required placeholder="Viết bình luận..." /><button className="button button-primary button-small">Gửi bình luận</button></form>}
      </section>
      <section className="panel-section">
        <div className="panel-section-heading"><h3>Tệp đính kèm</h3><span className="count">{attachments.length}</span></div>
        <div className="attachment-list">
          {attachments.map((attachment) => <div className="attachment-row" key={attachment.id}><span className="file-icon">↗</span><button className="attachment-name" onClick={() => void download(attachment.id)}>{attachment.fileName}</button><span className="file-size">{formatBytes(attachment.sizeBytes)}</span>{canEdit && (attachment.uploadedBy?.id === currentUserId || isOwner) && <button className="text-button danger-text" onClick={() => void deleteAttachment(attachment)}>Xóa</button>}</div>)}
          {attachments.length === 0 && <p className="muted small-text">Chưa có tệp đính kèm.</p>}
        </div>
        {canEdit && <label className={`upload-button ${uploading ? 'uploading' : ''}`}>{uploading ? 'Đang tải tệp lên...' : '＋ Thêm tệp'}<input type="file" disabled={uploading} onChange={(event) => { void handleUpload(event.target.files?.[0]); event.target.value = ''; }} /></label>}
        <p className="helper-text">Tối đa 10 MiB. Loại tệp theo allowlist được cấu hình ở backend.</p>
      </section>
      {canEdit && <div className="task-danger-zone"><button className="button button-quiet danger-text" onClick={() => void deleteTask()}>Xóa công việc</button></div>}
    </aside>
  );
}

async function updateSubtask(projectId: string, task: Task, done: boolean, setError: (value: string) => void, reload: () => Promise<void>, refresh: () => Promise<void>, remove = false) {
  setError('');
  try {
    if (remove) {
      if (!window.confirm(`Xóa công việc con “${task.title}”?`)) return;
      await taskApi.delete(projectId, task.id);
    } else {
      await taskApi.update(projectId, task.id, { status: done ? 'DONE' : 'TODO' });
    }
    await reload();
    await refresh();
  } catch (requestError) { setError(messageOf(requestError)); }
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function App() {
  const { ready } = useAuth();
  if (!ready) return <Loading label="Đang tải TaskFlow" />;
  return <Routes>
    <Route path="/login" element={<PublicOnly><AuthPage /></PublicOnly>} />
    <Route path="/register" element={<PublicOnly><AuthPage register /></PublicOnly>} />
    <Route path="/projects" element={<Guarded><ProjectsPage /></Guarded>} />
    <Route path="/projects/:projectId" element={<Guarded><WorkspacePage /></Guarded>} />
    <Route path="*" element={<Navigate to="/projects" replace />} />
  </Routes>;
}
