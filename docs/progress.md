# Báo cáo tiến độ và Lộ trình hoàn thiện TaskFlow

Tài liệu này ghi nhận toàn bộ quá trình phát triển dự án **TaskFlow**, tổng hợp kết quả của các giai đoạn đã qua, hiện trạng hệ thống và danh sách chi tiết các hạng mục cần hoàn thiện.

---

## 1. Tổng quan các mốc đã thực hiện

### Tuần 1 (11/10/2026 – 17/10/2026): Khởi tạo Nền tảng Backend, CI/CD và Hạ tầng AWS
- **Kiến trúc Backend:**
  - Khởi tạo backend NestJS với TypeScript, Prisma ORM 7 và PostgreSQL 16.
  - Thiết lập Docker Compose cho môi trường phát triển local (PostgreSQL, SeaweedFS S3 emulator, MailHog).
  - Triển khai xác thực người dùng bằng JWT (access token 15 phút) và refresh token xoay vòng lưu SHA-256 hash trong database, phát hiện replay thu hồi phiên đăng nhập (`AuthSession`, `RefreshToken`). Mật khẩu băm bằng Argon2id.
  - Phân quyền theo dự án (RBAC): `OWNER`, `MEMBER`, `VIEWER`.
  - CRUD Dự án và quản lý thành viên, chuyển quyền sở hữu (Transfer Ownership), archive/khôi phục dự án.
  - CRUD Công việc (Task) và công việc con (Sub-task 1 cấp) với trạng thái (`TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`), mức độ ưu tiên (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), hạn hoàn thành (due date), người thực hiện (assignee) và soft-delete/khôi phục (`deleted_at`).
  - Health checks: `/health/live` (tiến trình hoạt động) và `/health/ready` (kết nối PostgreSQL thành công); endpoint `/version` trả về Git SHA và thời gian build.
- **Hạ tầng AWS bằng Terraform:**
  - Tạo 26 tài nguyên: VPC mặc định, Subnet, Security Group (mở port 80/443), EC2 `t3.small` Amazon Linux 2023, EBS gp3 mã hóa cho PostgreSQL data (20 GiB), ECR repository, IAM role OIDC cho GitHub Actions, S3 buckets (attachments và backups).
- **CI/CD Pipeline (GitHub Actions):**
  - Workflow CI: 3 job độc lập (`test`, `e2e` trên PostgreSQL container, `image` build Docker multi-stage & scan lỗ hổng bằng Aqua Security Trivy).
  - Workflow CD: OIDC xác thực với AWS không cần lưu credentials tĩnh, build & push image lên ECR, deploy lên EC2 qua AWS Systems Manager (SSM) Run Command.
  - Cấu hình Production runtime lưu secrets trong AWS SSM Parameter Store dạng `SecureString`.

### Tuần 2 (18/10/2026 – 24/10/2026): Tính năng Cộng tác (Collaboration - Comments & S3 Attachments)
- **Bình luận công việc (Task Comments):**
  - Bổ sung bảng `task_comments` (giới hạn 5.000 ký tự).
  - Quyền truy cập: Thành viên dự án được xem; Owner và Member được tạo; tác giả có quyền sửa/xóa bình luận của mình; Owner có thể quản lý bình luận của mọi thành viên.
- **Tệp đính kèm qua Amazon S3 (Attachments):**
  - Bổ sung bảng `attachments`, lưu metadata trong PostgreSQL và file thực tế trên S3 bucket riêng tư.
  - Luồng upload/download an toàn bằng Presigned URL: Giới hạn dung lượng tối đa 10 MiB, kiểm tra MIME type theo allowlist cấu hình, presigned URL hết hạn sau 5 phút. Object key dùng UUID ngẫu nhiên theo cấu trúc prefix an toàn.
  - Xác nhận upload thành công qua S3 `HeadObject` trước khi kích hoạt tệp đính kèm.
  - Cấu hình SeaweedFS cho môi trường local và S3 bucket mã hóa AES256 cho production.

### Tuần 3 (25/10/2026): Xây dựng Frontend MVP
- Khởi tạo frontend bằng React 19, TypeScript và Vite.
- Thiết kế giao diện hiện đại, tinh gọn bao phủ toàn bộ các API đã có:
  - Trang Đăng nhập & Đăng ký tài khoản.
  - Trang Danh sách Dự án: Tạo dự án mới, lưu trữ (archive), khôi phục dự án.
  - Không gian làm việc Dự án (Workspace):
    - Quản lý danh sách thành viên (thêm thành viên theo email, thay đổi vai trò Owner/Member/Viewer).
    - Quản lý Task: Danh sách công việc, lọc theo trạng thái/mức độ ưu tiên, tạo mới, chỉnh sửa thông tin, gắn người thực hiện, đặt hạn hoàn thành, soft-delete.
    - Quản lý Sub-task: Thêm và tích hoàn thành công việc con một cấp.
    - Quản lý Bình luận: Xem danh sách thảo luận theo thời gian thực, viết bình luận, chỉnh sửa và xóa bình luận.
    - Quản lý Tệp đính kèm: Chọn tệp upload trực tiếp lên S3 qua presigned URL, tải xuống và xóa tệp.
- Tự động quản lý access token trong bộ nhớ và refresh token qua HttpOnly cookie với cùng origin (Vite dev proxy).

### Hiện tại (31/10/2026): Hoàn thiện Dashboard Thống kê, Xuất Báo cáo CSV & Chuẩn hóa Tài liệu
- **Dashboard Thống kê (Backend & Frontend):**
  - Backend cung cấp endpoint `GET /projects/:projectId/metrics` tổng hợp các chỉ số: tổng task, phân bố trạng thái, mức độ ưu tiên, task quá hạn, task sắp tới hạn trong 7 ngày, tỷ lệ hoàn thành công việc, thống kê khối lượng công việc theo từng thành viên, tổng số thảo luận và tệp đính kèm.
  - Frontend bổ sung tab điều hướng "Tổng quan (Dashboard)" trực quan với Metric Cards, thanh tiến độ %, các thanh tỷ lệ trạng thái/ưu tiên kèm tính năng tương tác lọc nhanh, và bảng phân bổ công việc theo thành viên nhóm.
- **Xuất Báo cáo CSV (Backend & Frontend):**
  - Backend cung cấp endpoint `GET /projects/:projectId/tasks/export` xuất danh sách công việc của dự án ra file CSV chuẩn RFC 4180 kèm UTF-8 BOM (`\uFEFF`), hỗ trợ tiếng Việt có dấu hoàn hảo trên Excel.
  - Frontend bổ sung nút "Xuất CSV" trên thanh công cụ công việc và trong màn hình tổng quan Dashboard, tự động kích hoạt tải file `.csv` về máy.
- **Chuẩn hóa cấu trúc tài liệu:** Hợp nhất toàn bộ báo cáo tiến độ tuần vào file [docs/progress.md](file:///home/hotboyhust/project/taskflow/docs/progress.md) duy nhất và cập nhật README.

---

## 2. Ma trận Trạng thái Hệ thống

| Hạng mục | Trạng thái hiện tại | Môi trường xác minh |
|---|---|---|
| Xác thực & Quản lý phiên JWT/Refresh token | Hoàn tất | Local & EC2 Production |
| CRUD Dự án & Phân quyền RBAC | Hoàn tất | Local & EC2 Production |
| CRUD Task & Sub-task (1 cấp), Soft-delete | Hoàn tất | Local & EC2 Production |
| Bình luận (Comments) & Tệp đính kèm (Attachments) | Hoàn tất mã nguồn & E2E API | Local & CI Pipeline |
| Dashboard Thống kê (Metrics API & UI) | Hoàn tất | Local & CI Pipeline |
| Xuất dữ liệu CSV (CSV Export API & Download UI) | Hoàn tất | Local & CI Pipeline |
| Frontend MVP (React 19 + TypeScript + Vite) | Hoàn tất mã nguồn | Local Dev Server |
| Hạ tầng AWS Terraform cơ sở (EC2, S3, EBS, ECR, IAM OIDC) | Đã triển khai | AWS Account (`ap-southeast-1`) |
| Pipeline CI/CD (GitHub Actions OIDC -> ECR -> SSM) | Đã kích hoạt | GitHub Actions |
| Reverse Proxy Nginx & HTTPS công khai | **Chưa triển khai** | Cần thiết lập |
| Triển khai Frontend lên Production (S3/CloudFront hoặc Docker) | **Chưa triển khai** | Cần thiết lập |
| Tự động sao lưu PostgreSQL lên S3 & Diễn tập khôi phục | **Chưa triển khai** | Cần thiết lập |
| Giám sát hệ thống (Prometheus, Grafana, CloudWatch Alerts) | **Chưa triển khai** | Cần thiết lập |
| Dịch vụ Email & Thông báo In-app | **Chưa triển khai** | Cần thiết lập |
| Công việc lặp định kỳ (Recurring Tasks) | **Chưa triển khai** | Cần thiết lập |
| Feature Flags & Quản trị hệ thống | **Chưa triển khai** | Cần thiết lập |

---

## 3. Danh sách Những gì Cần Hoàn thiện (Roadmap)

Dưới đây là các hạng mục tồn đọng được phân loại theo từng nhóm chuyên môn và mức độ ưu tiên:

### 3.1. Tính năng Nghiệp vụ Cốt lõi
1. **Hệ thống Thông báo (In-app Notifications):**
   - Bổ sung bảng `notifications` trong Prisma schema và migration.
   - Tạo API quản lý thông báo: `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`.
   - Tự động gửi thông báo khi: được phân công task, có bình luận mới trong task tham gia, trạng thái task thay đổi, task sắp tới hạn.
   - Thêm biểu tượng chuông thông báo (Notification bell badge & dropdown) ở thanh điều hướng Frontend.
2. **Dịch vụ Email (SES / MailHog):**
   - Triển khai email service kết nối SMTP MailHog khi chạy local và AWS SES khi triển khai production.
   - Gửi email thông báo khi được gán việc quan trọng hoặc nhắc nhở trước hạn hoàn thành.
3. **Công việc lặp định kỳ (Recurring Tasks):**
   - Thiết kế quy tắc lặp (Hằng ngày, Hằng tuần, Hằng tháng theo giờ UTC và xử lý ngày cuối tháng).
   - Thiết lập cron job tự động sinh instance task mới khi tới chu kỳ hoặc khi task trước hoàn tất.
4. **Feature Flags:**
   - Quản lý cờ tính năng trong database, cập nhật có hiệu lực ngay tại runtime.
   - Cung cấp API và guard kiểm tra flag cho backend và frontend.
5. **Quản lý Tài khoản Cá nhân:**
   - Đổi mật khẩu chủ động (`POST /auth/change-password`).
   - Quên mật khẩu và đặt lại mật khẩu an toàn qua email token.
   - Cập nhật thông tin tài khoản (tên hiển thị, avatar).

### 3.2. Nâng cấp Giao diện & Trải nghiệm Người dùng (Frontend)
1. **Tách module mã nguồn:** Tái cấu trúc file `App.tsx` (hiện dài hơn 800 dòng) thành các thư mục chuẩn: `components/`, `pages/`, `hooks/`, `context/`.
2. **Bảng kéo thả Kanban Board:** Bổ sung giao diện Kanban với các cột trạng thái để người dùng kéo thả task trực quan.
3. **Tìm kiếm & Bộ lọc nâng cao:**
   - Thanh tìm kiếm từ khóa theo tiêu đề và nội dung task.
   - Bộ lọc theo người thực hiện, khoảng ngày hết hạn, task quá hạn.
4. **Toast Notification System:** Thay thế các thông báo lỗi tĩnh bằng popup Toast thông báo phản hồi thao tác thành công/thất bại.
5. **Thanh tiến trình tải tệp (Upload Progress):** Hiển thị % tiến độ khi tải các tệp đính kèm dung lượng lớn lên S3.

### 3.3. Hạ tầng DevOps, Vận hành & Bảo mật
1. **Reverse Proxy & Chứng chỉ HTTPS Công khai:**
   - Cấu hình Nginx hoặc AWS Application Load Balancer (ALB) làm reverse proxy lắng nghe cổng 80/443.
   - Tích hợp chứng chỉ SSL Let's Encrypt / AWS Certificate Manager (ACM) để cung cấp HTTPS an toàn cho người dùng cuối.
2. **Triển khai Production cho Frontend:**
   - Đóng gói frontend thành production container hoặc triển khai lên AWS S3 Static Hosting kết hợp CloudFront CDN.
   - Cấu hình domain và routing tích hợp liền mạch với backend API.
3. **Tự động sao lưu Database lên S3 & Diễn tập Khôi phục:**
   - Xây dựng cron job / systemd service chạy `pg_dump` định kỳ hàng ngày, nén và tải lên S3 bucket `backups`.
   - Thiết lập chính sách vòng đời (lifecycle policy) tự động xóa backup cũ theo biến `backup_retention_days`.
   - Xây dựng tài liệu và kịch bản diễn tập khôi phục (Disaster Recovery Drill) thực tế.
4. **Giám sát & Cảnh báo (Monitoring & Alerting):**
   - Expose endpoint Prometheus metrics `/metrics` từ backend NestJS.
   - Thiết lập Prometheus & Grafana hoặc cấu hình CloudWatch Agent thu thập CPU, RAM, Disk, HTTP request latency và DB connection pool.
   - Cấu hình CloudWatch Alarms gửi cảnh báo qua Email/SNS khi hệ thống gặp sự cố hoặc tải cao.
5. **Rate Limiting & Bảo mật API:**
   - Cài đặt `@nestjs/throttler` bảo vệ các route nhạy cảm như `/auth/login`, `/auth/register` chống tấn công brute-force.
   - Tích hợp tài liệu API Swagger / OpenAPI (`@nestjs/swagger`) tại `/api-docs`.
6. **Kiểm thử Tải & Hiệu năng (Load Testing):**
   - Viết kịch bản kiểm thử tải k6 mô phỏng người dùng đồng thời để đánh giá ngưỡng chịu tải của EC2 và database.
