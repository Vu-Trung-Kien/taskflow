import { useEffect, useState } from 'react';
import type { ProjectMetrics, TaskPriority, TaskStatus } from '../../types';
import { projectApi, ApiError } from '../../api';
import { Avatar } from '../ui/Avatar';
import { RoleBadge, PriorityBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  BarChart3Icon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  DownloadIcon,
  RefreshCwIcon,
  MessageSquareIcon,
  PaperclipIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  Loader2Icon,
} from '../icons';

export const statusLabels: Record<TaskStatus, string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  DONE: 'Hoàn tất',
  BLOCKED: 'Bị chặn',
};

export const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
};

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}

interface DashboardPanelProps {
  projectId: string;
  onNavigateToTasks: (filters?: { status?: string; priority?: string }) => void;
  onExportCsv?: () => Promise<void>;
  exporting?: boolean;
}

export function DashboardPanel({
  projectId,
  onNavigateToTasks,
  onExportCsv,
  exporting = false,
}: DashboardPanelProps) {
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
    return (
      <div className="tf-dashboard-loading">
        <Loader2Icon size={32} className="animate-spin tf-text-primary" />
        <p>Đang tổng hợp số liệu phân tích dự án...</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="tf-alert tf-alert-error" role="alert">
        <AlertCircleIcon size={18} />
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={() => void loadMetrics()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!metrics) return null;

  const { tasks, members, activity } = metrics;
  const total = tasks.total;

  return (
    <section className="tf-dashboard-layout" aria-label="Báo cáo phân tích">
      {/* Dashboard Top Header */}
      <div className="tf-dashboard-header">
        <div className="tf-dashboard-header-text">
          <span className="tf-eyebrow">BÁO CÁO TIẾN ĐỘ & HIỆU SUẤT</span>
          <h2 className="tf-dashboard-title">Tổng quan dự án</h2>
          <p className="tf-dashboard-desc">
            Theo dõi sức khỏe dự án, phân bổ khối lượng công việc và hiệu suất thành viên trong thời gian thực.
          </p>
        </div>

        <div className="tf-dashboard-header-actions">
          {onExportCsv && (
            <Button
              variant="outline"
              size="sm"
              icon={<DownloadIcon size={15} />}
              onClick={() => void onExportCsv()}
              loading={exporting}
              title="Xuất dữ liệu dự án sang file CSV"
            >
              Xuất CSV
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCwIcon size={15} className={loading ? 'animate-spin' : ''} />}
            onClick={() => void loadMetrics()}
            disabled={loading}
          >
            Làm mới số liệu
          </Button>
        </div>
      </div>

      {error && (
        <div className="tf-alert tf-alert-error" role="alert">
          <AlertCircleIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Key Metric Cards */}
      <div className="tf-metric-cards-grid">
        <div
          className="tf-metric-card"
          onClick={() => onNavigateToTasks({ status: '', priority: '' })}
          role="button"
          tabIndex={0}
        >
          <div className="tf-metric-card-top">
            <span className="tf-metric-card-label">Tổng công việc</span>
            <div className="tf-metric-icon-box tf-metric-icon-indigo">
              <BarChart3Icon size={18} />
            </div>
          </div>
          <div className="tf-metric-card-value">{tasks.total}</div>
          <div className="tf-metric-card-hint">
            <span>Đang hoạt động trong dự án</span>
            <ChevronRightIcon size={13} className="tf-metric-chevron" />
          </div>
        </div>

        <div
          className="tf-metric-card"
          onClick={() => onNavigateToTasks({ status: 'DONE', priority: '' })}
          role="button"
          tabIndex={0}
        >
          <div className="tf-metric-card-top">
            <span className="tf-metric-card-label">Đã hoàn thành</span>
            <div className="tf-metric-icon-box tf-metric-icon-emerald">
              <CheckCircleIcon size={18} />
            </div>
          </div>
          <div className="tf-metric-card-value tf-text-success">{tasks.byStatus.DONE}</div>
          <div className="tf-metric-card-hint">
            <span className="tf-text-success font-semibold">{tasks.completionRate}% hoàn tất</span>
            <ChevronRightIcon size={13} className="tf-metric-chevron" />
          </div>
        </div>

        <div
          className="tf-metric-card"
          onClick={() => onNavigateToTasks({ status: 'IN_PROGRESS', priority: '' })}
          role="button"
          tabIndex={0}
        >
          <div className="tf-metric-card-top">
            <span className="tf-metric-card-label">Đang thực hiện</span>
            <div className="tf-metric-icon-box tf-metric-icon-amber">
              <ClockIcon size={18} />
            </div>
          </div>
          <div className="tf-metric-card-value tf-text-amber">{tasks.byStatus.IN_PROGRESS}</div>
          <div className="tf-metric-card-hint">
            <span>{tasks.byStatus.TODO} việc còn lại cần làm</span>
            <ChevronRightIcon size={13} className="tf-metric-chevron" />
          </div>
        </div>

        <div
          className={`tf-metric-card ${tasks.overdue > 0 ? 'tf-metric-card-alert' : ''}`}
          onClick={() => onNavigateToTasks({ status: '', priority: '' })}
          role="button"
          tabIndex={0}
        >
          <div className="tf-metric-card-top">
            <span className="tf-metric-card-label">Công việc quá hạn</span>
            <div className="tf-metric-icon-box tf-metric-icon-rose">
              <AlertTriangleIcon size={18} />
            </div>
          </div>
          <div className={`tf-metric-card-value ${tasks.overdue > 0 ? 'tf-text-danger' : ''}`}>
            {tasks.overdue}
          </div>
          <div className="tf-metric-card-hint">
            <span>{tasks.dueSoon} việc tới hạn trong 7 ngày</span>
            <ChevronRightIcon size={13} className="tf-metric-chevron" />
          </div>
        </div>
      </div>

      {/* Overall Project Progress Section */}
      <div className="tf-dashboard-card tf-overall-progress-card">
        <div className="tf-card-header-row">
          <div>
            <h3 className="tf-card-title">Tiến độ tổng thể dự án</h3>
            <p className="tf-card-subtitle">
              {tasks.byStatus.DONE} trên tổng số {tasks.total} công việc đã hoàn thành
            </p>
          </div>
          <div className="tf-progress-badge-large">{tasks.completionRate}%</div>
        </div>

        <div className="tf-progress-bar-track">
          <div
            className="tf-progress-bar-fill"
            style={{ width: `${Math.min(100, Math.max(0, tasks.completionRate))}%` }}
          />
        </div>

        <div className="tf-progress-summary-row">
          <div className="tf-progress-meta-item">
            <span className="tf-meta-dot dot-done" />
            <span>Đã hoàn thành: <strong>{tasks.byStatus.DONE}</strong></span>
          </div>
          <div className="tf-progress-meta-item">
            <span className="tf-meta-dot dot-progress" />
            <span>Đang làm: <strong>{tasks.byStatus.IN_PROGRESS}</strong></span>
          </div>
          <div className="tf-progress-meta-item">
            <span className="tf-meta-dot dot-todo" />
            <span>Cần làm: <strong>{tasks.byStatus.TODO}</strong></span>
          </div>
          {tasks.byStatus.BLOCKED > 0 && (
            <div className="tf-progress-meta-item tf-text-danger">
              <span className="tf-meta-dot dot-blocked" />
              <span>Bị chặn: <strong>{tasks.byStatus.BLOCKED}</strong> việc</span>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Section: Status Distribution & Priority Distribution */}
      <div className="tf-dashboard-grid-2col">
        {/* Status Distribution */}
        <div className="tf-dashboard-card">
          <div className="tf-card-header-row">
            <div>
              <h3 className="tf-card-title">Phân bố theo trạng thái</h3>
              <p className="tf-card-subtitle">Nhấp vào trạng thái để lọc nhanh danh sách</p>
            </div>
          </div>

          <div className="tf-distribution-list">
            {(['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'] as TaskStatus[]).map((st) => {
              const count = tasks.byStatus[st] ?? 0;
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;

              return (
                <button
                  key={st}
                  type="button"
                  className="tf-distribution-btn"
                  onClick={() => onNavigateToTasks({ status: st, priority: '' })}
                  title={`Lọc công việc trạng thái ${statusLabels[st]}`}
                >
                  <div className="tf-dist-row-top">
                    <span className="tf-dist-label">{statusLabels[st]}</span>
                    <span className="tf-dist-count">
                      <strong>{count}</strong> <span className="tf-text-muted">({percent}%)</span>
                    </span>
                  </div>
                  <div className="tf-sub-progress-track">
                    <div
                      className={`tf-sub-progress-bar status-${st.toLowerCase().replace('_', '-')}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="tf-dashboard-card">
          <div className="tf-card-header-row">
            <div>
              <h3 className="tf-card-title">Mức độ ưu tiên</h3>
              <p className="tf-card-subtitle">Nhấp vào mức ưu tiên để lọc nhanh danh sách</p>
            </div>
          </div>

          <div className="tf-distribution-list">
            {(['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as TaskPriority[]).map((pr) => {
              const count = tasks.byPriority[pr] ?? 0;
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;

              return (
                <button
                  key={pr}
                  type="button"
                  className="tf-distribution-btn"
                  onClick={() => onNavigateToTasks({ status: '', priority: pr })}
                  title={`Lọc công việc mức ${priorityLabels[pr]}`}
                >
                  <div className="tf-dist-row-top">
                    <PriorityBadge priority={pr} />
                    <span className="tf-dist-count">
                      <strong>{count}</strong> <span className="tf-text-muted">({percent}%)</span>
                    </span>
                  </div>
                  <div className="tf-sub-progress-track">
                    <div
                      className={`tf-sub-progress-bar priority-${pr.toLowerCase()}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Workload Table */}
      <div className="tf-dashboard-card">
        <div className="tf-card-header-row">
          <div>
            <h3 className="tf-card-title">Phân bổ công việc theo thành viên</h3>
            <p className="tf-card-subtitle">
              Tổng số {members.total} thành viên tham gia thực hiện dự án
            </p>
          </div>
          <div className="tf-activity-summary-tags">
            <span className="tf-activity-chip">
              <MessageSquareIcon size={14} /> {activity.totalComments} bình luận
            </span>
            <span className="tf-activity-chip">
              <PaperclipIcon size={14} /> {activity.totalAttachments} tệp đính kèm
            </span>
          </div>
        </div>

        <div className="tf-table-container">
          <table className="tf-table">
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Vai trò</th>
                <th className="tf-text-center">Được giao</th>
                <th className="tf-text-center">Đã xong</th>
                <th className="tf-text-center">Quá hạn</th>
                <th className="tf-text-right">Tỷ lệ hoàn thành</th>
              </tr>
            </thead>
            <tbody>
              {members.breakdown.map((m) => {
                const completion =
                  m.assignedTasks > 0
                    ? Math.round((m.completedTasks / m.assignedTasks) * 100)
                    : 0;

                return (
                  <tr key={m.userId}>
                    <td>
                      <div className="tf-user-table-cell">
                        <Avatar name={m.name} email={m.email} size="sm" />
                        <div className="tf-user-info-text">
                          <strong className="tf-user-primary-name">{m.name || m.email}</strong>
                          {m.name && <span className="tf-user-secondary-email">{m.email}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <RoleBadge role={m.role} />
                    </td>
                    <td className="tf-text-center font-semibold">{m.assignedTasks}</td>
                    <td className="tf-text-center tf-text-success font-semibold">
                      {m.completedTasks}
                    </td>
                    <td className="tf-text-center">
                      {m.overdueTasks > 0 ? (
                        <span className="tf-badge tf-badge-danger">{m.overdueTasks}</span>
                      ) : (
                        <span className="tf-text-muted">0</span>
                      )}
                    </td>
                    <td className="tf-text-right">
                      <div className="tf-member-progress-wrap">
                        <span className="tf-percent-text">
                          {m.assignedTasks > 0 ? `${completion}%` : '—'}
                        </span>
                        {m.assignedTasks > 0 && (
                          <div className="tf-mini-progress-track">
                            <div
                              className="tf-mini-progress-fill"
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
