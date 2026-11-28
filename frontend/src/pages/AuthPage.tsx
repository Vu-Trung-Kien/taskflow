import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, authApi } from '../api';
import { useAuth } from '../auth';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  SparklesIcon,
  UsersIcon,
  BarChart3Icon,
} from '../components/icons';
import { Button } from '../components/ui/Button';

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}

export function AuthPage({ register = false }: { register?: boolean }) {
  const { signIn, sessionError } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    <main className="tf-auth-layout">
      {/* Left Pitch Showcase */}
      <section className="tf-auth-showcase">
        <div className="tf-auth-showcase-content">
          <Link to="/login" className="tf-auth-brand">
            <div className="tf-brand-icon-lg">
              <SparklesIcon size={22} />
            </div>
            <span className="tf-brand-logo-text">TaskFlow</span>
          </Link>

          <div className="tf-auth-hero-copy">
            <div className="tf-auth-tag">
              <span className="tf-tag-dot" />
              NỀN TẢNG QUẢN LÝ CÔNG VIỆC THẾ HỆ MỚI
            </div>
            <h1 className="tf-auth-hero-heading">
              Tổ chức mọi dự án.<br />Nâng tầm hiệu suất đội ngũ.
            </h1>
            <p className="tf-auth-hero-desc">
              Không gian làm việc trực quan để quản lý công việc, theo dõi tiến độ và cộng tác trong nhóm.
            </p>
          </div>

          <div className="tf-auth-preview-card">
            <div className="tf-preview-header">
              <div className="tf-preview-dots">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <span className="tf-preview-title">TaskFlow Workspace</span>
            </div>
            <div className="tf-preview-body">
              <div className="tf-preview-task">
                <div className="tf-preview-task-top">
                  <span className="tf-preview-badge">Khẩn cấp</span>
                  <span className="tf-preview-time">Hạn hôm nay</span>
                </div>
                <div className="tf-preview-task-name">Thiết kế hệ thống Design System v2.0</div>
                <div className="tf-preview-progress">
                  <div className="tf-preview-bar" style={{ width: '80%' }} />
                </div>
              </div>

              <div className="tf-preview-features-list">
                <div className="tf-preview-feature">
                  <BarChart3Icon size={16} />
                  <span>Báo cáo tiến độ phân tích chi tiết</span>
                </div>
                <div className="tf-preview-feature">
                  <UsersIcon size={16} />
                  <span>Phân quyền và phối hợp nhiều thành viên</span>
                </div>
              </div>
            </div>
          </div>

          <div className="tf-auth-showcase-footer">
            <div className="tf-auth-check-items">
              <span className="tf-check-pill">
                <CheckCircleIcon size={14} /> Bảo mật & mã hóa
              </span>
              <span className="tf-check-pill">
                <CheckCircleIcon size={14} /> Trải nghiệm mượt mà
              </span>
              <span className="tf-check-pill">
                <CheckCircleIcon size={14} /> Giao diện tối ưu
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Form Main */}
      <section className="tf-auth-main">
        <div className="tf-auth-card">
          <div className="tf-auth-card-header">
            <div className="tf-auth-mobile-logo">
              <div className="tf-brand-icon">
                <SparklesIcon size={18} />
              </div>
              <span>TaskFlow</span>
            </div>
            <h2 className="tf-auth-title">{register ? 'Tạo tài khoản mới' : 'Đăng nhập vào tài khoản'}</h2>
            <p className="tf-auth-subtitle">
              {register
                ? 'Bắt đầu quản lý công việc và dự án của nhóm bạn chỉ trong vài giây.'
                : 'Chào mừng trở lại! Vui lòng nhập thông tin xác thực để tiếp tục.'}
            </p>
          </div>

          {sessionError && (
            <div className="tf-auth-alert" role="alert">
              <AlertCircleIcon size={18} />
              <span>Không thể khôi phục phiên trước đó: {sessionError}</span>
            </div>
          )}

          {error && (
            <div className="tf-auth-alert" role="alert">
              <AlertCircleIcon size={18} />
              <span>{error}</span>
            </div>
          )}

          <form className="tf-auth-form" onSubmit={handleSubmit}>
            {register && (
              <div className="tf-field-group">
                <label htmlFor="name" className="tf-field-label">
                  Tên hiển thị
                </label>
                <input
                  id="name"
                  name="name"
                  className="tf-input"
                  autoComplete="name"
                  minLength={1}
                  maxLength={100}
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
              </div>
            )}

            <div className="tf-field-group">
              <label htmlFor="email" className="tf-field-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="tf-input"
                autoComplete="email"
                required
                placeholder="ban@congty.com"
              />
            </div>

            <div className="tf-field-group">
              <div className="tf-label-row">
                <label htmlFor="password" className="tf-field-label">
                  Mật khẩu
                </label>
              </div>
              <div className="tf-password-input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="tf-input tf-password-input"
                  autoComplete={register ? 'new-password' : 'current-password'}
                  minLength={register ? 12 : 1}
                  maxLength={128}
                  required
                  placeholder={register ? 'Tối thiểu 12 ký tự' : 'Nhập mật khẩu của bạn'}
                />
                <button
                  type="button"
                  className="tf-password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
              {register && (
                <span className="tf-field-hint">Mật khẩu cần có ít nhất 12 ký tự để đảm bảo an toàn.</span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="tf-auth-submit-btn"
            >
              {register ? 'Tạo tài khoản' : 'Đăng nhập'}
            </Button>
          </form>

          <div className="tf-auth-footer">
            <span className="tf-auth-switch-text">
              {register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
            </span>{' '}
            <Link
              to={register ? '/login' : '/register'}
              className="tf-auth-switch-link"
            >
              {register ? 'Đăng nhập ngay' : 'Đăng ký miễn phí'}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
