import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth';
import { authApi } from '../../api';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  Loader2Icon,
  ShieldIcon,
  UserIcon,
} from '../icons';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile Form State
  const [name, setName] = useState(user?.name ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  if (!user) return null;

  async function handleUpdateProfile(e: FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);

    try {
      const updated = await authApi.updateProfile({ name: name.trim() });
      updateUser({ name: updated.name });
      setProfileSuccess('Cập nhật thông tin tài khoản thành công!');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Không thể cập nhật hồ sơ.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 12) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 12 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }

    setPasswordSaving(true);

    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess(res.message || 'Mật khẩu đã được thay đổi thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại.');
    } finally {
      setPasswordSaving(false);
    }
  }

  function handleClose() {
    setProfileError('');
    setProfileSuccess('');
    setPasswordError('');
    setPasswordSuccess('');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cài đặt tài khoản"
      description="Quản lý thông tin cá nhân và bảo mật tài khoản TaskFlow của bạn."
      maxWidth="md"
    >
      <div className="tf-profile-settings">
        {/* Navigation Tabs */}
        <div className="tf-modal-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
          <button
            type="button"
            className={`tf-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              backgroundColor: activeTab === 'profile' ? 'var(--color-primary-light, #eff6ff)' : 'transparent',
              color: activeTab === 'profile' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            }}
          >
            <UserIcon size={16} />
            <span>Hồ sơ cá nhân</span>
          </button>
          <button
            type="button"
            className={`tf-tab-btn ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              backgroundColor: activeTab === 'password' ? 'var(--color-primary-light, #eff6ff)' : 'transparent',
              color: activeTab === 'password' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            }}
          >
            <ShieldIcon size={16} />
            <span>Đổi mật khẩu & Bảo mật</span>
          </button>
        </div>

        {/* Tab 1: Profile Information */}
        {activeTab === 'profile' && (
          <form onSubmit={(e) => void handleUpdateProfile(e)} className="tf-form-stack" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {profileSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-md)', backgroundColor: '#ecfdf5', color: '#065f46', fontSize: '14px' }}>
                <CheckCircleIcon size={16} />
                <span>{profileSuccess}</span>
              </div>
            )}
            {profileError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '14px' }}>
                <AlertCircleIcon size={16} />
                <span>{profileError}</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'var(--color-bg-subtle, #f8fafc)', borderRadius: 'var(--radius-md)' }}>
              <Avatar name={name || user.name} email={user.email} size="lg" />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{name || user.name || 'Người dùng'}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{user.email}</div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Địa chỉ Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle, #f8fafc)', color: 'var(--color-text-muted)' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                Email đăng nhập là duy nhất và không thể thay đổi.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Tên hiển thị
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập họ và tên hiển thị..."
                maxLength={100}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button type="button" variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" disabled={profileSaving || !name.trim()}>
                {profileSaving ? (
                  <>
                    <Loader2Icon size={14} className="animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  'Lưu thay đổi'
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 2: Change Password */}
        {activeTab === 'password' && (
          <form onSubmit={(e) => void handleChangePassword(e)} className="tf-form-stack" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {passwordSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-md)', backgroundColor: '#ecfdf5', color: '#065f46', fontSize: '14px' }}>
                <CheckCircleIcon size={16} />
                <span>{passwordSuccess}</span>
              </div>
            )}
            {passwordError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '14px' }}>
                <AlertCircleIcon size={16} />
                <span>{passwordError}</span>
              </div>
            )}

            <div style={{ padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#1e40af' }}>
              <strong>Lưu ý bảo mật:</strong> Sau khi đổi mật khẩu thành công, toàn bộ các phiên đăng nhập trên các thiết bị khác sẽ tự động bị thu hồi ngay lập tức.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại..."
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Mật khẩu mới
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 12 ký tự..."
                minLength={12}
                maxLength={128}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                Khuyến nghị kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                minLength={12}
                maxLength={128}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button type="button" variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
              >
                {passwordSaving ? (
                  <>
                    <Loader2Icon size={14} className="animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  'Cập nhật mật khẩu'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
