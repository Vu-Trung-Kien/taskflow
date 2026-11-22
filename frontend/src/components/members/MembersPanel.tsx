import { useState, type FormEvent } from 'react';
import type { ProjectMember, ProjectRole } from '../../types';
import { projectApi, ApiError } from '../../api';
import { Avatar } from '../ui/Avatar';
import { RoleBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  UsersIcon,
  UserPlusIcon,
  ShieldIcon,
  TrashIcon,
  AlertCircleIcon,
} from '../icons';

export const roleLabels: Record<ProjectRole, string> = {
  OWNER: 'Chủ dự án',
  MEMBER: 'Thành viên',
  VIEWER: 'Người xem',
};

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}

interface MembersPanelProps {
  projectId: string;
  members: ProjectMember[];
  currentUserId: string;
  canManage: boolean;
  onChanged: () => Promise<void>;
}

export function MembersPanel({
  projectId,
  members,
  currentUserId,
  canManage,
  onChanged,
}: MembersPanelProps) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Modals for confirmation
  const [removeMemberTarget, setRemoveMemberTarget] = useState<ProjectMember | null>(null);
  const [transferOwnerTarget, setTransferOwnerTarget] = useState<ProjectMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await projectApi.addMember(
        projectId,
        String(form.get('email') ?? '').trim(),
        String(form.get('role') ?? 'MEMBER') as 'MEMBER' | 'VIEWER',
      );
      formElement.reset();
      await onChanged();
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: 'MEMBER' | 'VIEWER') {
    setError('');
    try {
      await projectApi.updateMember(projectId, userId, newRole);
      await onChanged();
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function handleConfirmRemoveMember() {
    if (!removeMemberTarget) return;
    setActionLoading(true);
    setError('');
    try {
      await projectApi.removeMember(projectId, removeMemberTarget.userId);
      setRemoveMemberTarget(null);
      await onChanged();
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmTransferOwner() {
    if (!transferOwnerTarget) return;
    setActionLoading(true);
    setError('');
    try {
      await projectApi.transferOwner(projectId, transferOwnerTarget.userId);
      setTransferOwnerTarget(null);
      await onChanged();
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section className="tf-members-layout" aria-label="Quản lý thành viên">
      {/* Section Header */}
      <div className="tf-members-header">
        <div>
          <span className="tf-eyebrow">QUẢN LÝ QUYỀN TRUY CẬP</span>
          <h2 className="tf-members-title">Thành viên dự án</h2>
          <p className="tf-members-desc">
            Xem danh sách các cộng tác viên, phân quyền vai trò hoặc mời thêm thành viên mới tham gia vào dự án.
          </p>
        </div>
        <div className="tf-members-count-chip">
          <UsersIcon size={16} />
          <span>{members.length} thành viên</span>
        </div>
      </div>

      {error && (
        <div className="tf-alert tf-alert-error" role="alert">
          <AlertCircleIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Members List Card */}
      <div className="tf-dashboard-card tf-members-card">
        <div className="tf-members-list">
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const displayName = member.user.name || member.user.email;

            return (
              <div key={member.userId} className="tf-member-row">
                <div className="tf-member-user-cell">
                  <Avatar name={member.user.name} email={member.user.email} size="md" />
                  <div className="tf-member-info">
                    <div className="tf-member-name-row">
                      <strong className="tf-member-name">{displayName}</strong>
                      {isSelf && <span className="tf-self-tag">Bạn</span>}
                    </div>
                    <span className="tf-member-email">{member.user.email}</span>
                  </div>
                </div>

                <div className="tf-member-controls">
                  {canManage && member.role !== 'OWNER' ? (
                    <div className="tf-manage-role-group">
                      <select
                        aria-label={`Vai trò của ${member.user.email}`}
                        value={member.role}
                        onChange={(e) =>
                          void handleRoleChange(
                            member.userId,
                            e.target.value as 'MEMBER' | 'VIEWER',
                          )
                        }
                        className="tf-select tf-role-select"
                      >
                        <option value="MEMBER">Thành viên</option>
                        <option value="VIEWER">Người xem</option>
                      </select>

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<ShieldIcon size={14} />}
                        onClick={() => setTransferOwnerTarget(member)}
                        title="Chuyển quyền chủ sở hữu dự án cho thành viên này"
                      >
                        Chuyển quyền
                      </Button>

                      <Button
                        variant="quiet"
                        size="sm"
                        icon={<TrashIcon size={14} />}
                        className="tf-text-danger"
                        onClick={() => setRemoveMemberTarget(member)}
                        title="Xóa thành viên khỏi dự án"
                      >
                        Xóa
                      </Button>
                    </div>
                  ) : (
                    <RoleBadge role={member.role} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite Member Section (for Project Owners) */}
      {canManage && (
        <div className="tf-dashboard-card tf-invite-card">
          <div className="tf-invite-header">
            <div className="tf-invite-icon">
              <UserPlusIcon size={20} />
            </div>
            <div>
              <h3 className="tf-card-title">Mời thành viên mới</h3>
              <p className="tf-card-subtitle">
                Chỉ những tài khoản đã đăng ký trên hệ thống TaskFlow mới có thể được thêm vào dự án.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddMember} className="tf-invite-form">
            <div className="tf-invite-inputs">
              <div className="tf-field-group flex-1">
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="Nhập địa chỉ email thành viên..."
                  className="tf-input"
                />
              </div>

              <div className="tf-field-group">
                <select name="role" defaultValue="MEMBER" className="tf-select">
                  <option value="MEMBER">Thành viên (Được tạo & sửa việc)</option>
                  <option value="VIEWER">Người xem (Chỉ xem dữ liệu)</option>
                </select>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={saving}
                icon={<UserPlusIcon size={16} />}
              >
                Thêm thành viên
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(removeMemberTarget)}
        onClose={() => setRemoveMemberTarget(null)}
        onConfirm={handleConfirmRemoveMember}
        title="Xóa thành viên"
        message={`Bạn có chắc muốn xóa "${removeMemberTarget?.user.name || removeMemberTarget?.user.email}" khỏi dự án này không? Thành viên sẽ mất quyền truy cập toàn bộ công việc và tài liệu của dự án.`}
        confirmLabel="Xóa khỏi dự án"
        variant="danger"
        loading={actionLoading}
      />

      {/* Transfer Ownership Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(transferOwnerTarget)}
        onClose={() => setTransferOwnerTarget(null)}
        onConfirm={handleConfirmTransferOwner}
        title="Chuyển quyền Chủ dự án"
        message={`Bạn có chắc chắn muốn chuyển quyền Chủ dự án (OWNER) cho "${transferOwnerTarget?.user.name || transferOwnerTarget?.user.email}" không? Sau khi chuyển, bạn sẽ trở thành Thành viên (MEMBER) thông thường và không còn quyền xóa hoặc lưu trữ dự án này.`}
        confirmLabel="Chuyển quyền chủ dự án"
        variant="primary"
        loading={actionLoading}
      />
    </section>
  );
}
