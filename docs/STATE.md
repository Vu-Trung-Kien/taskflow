# Trạng thái Dự án & Tài liệu (STATE)

## Đang làm
- Chuẩn bị các bước hoàn thiện tiếp theo theo lộ trình phát triển:
  - Tích hợp tài liệu Swagger / OpenAPI (`@nestjs/swagger`) tại endpoint `/api-docs`.

## Đã xong
- **Gỡ bảng Kanban khỏi frontend**. Tab Công việc dùng danh sách. Thứ tự đã lưu và trường `position` trong API vẫn được sử dụng cho danh sách.
- **Đã xong Bước 10 (Quản lý Hồ sơ Cá nhân: PATCH /auth/profile & Profile Settings Modal)**:
  - Xây dựng DTO `UpdateProfileDto` tại `backend/src/auth/dto/update-profile.dto.ts` (`name?: string` với giới hạn độ dài 1-100 ký tự).
  - Triển khai phương thức `updateProfile` trong `AuthService` và endpoint `@Patch(['profile', 'me'])` trong `AuthController` bảo vệ bởi `AccessTokenGuard`.
  - Cập nhật client `authApi.updateProfile` và bổ sung hàm `updateUser` trong `AuthContext` (`frontend/src/auth.tsx`).
  - Xây dựng modal hoàn chỉnh `ProfileSettingsModal.tsx` gồm 2 tab: "Hồ sơ cá nhân" (chỉnh sửa tên hiển thị) và "Bảo mật & Mật khẩu" (đổi mật khẩu chủ động kèm thông báo bảo mật đăng xuất phiên khác).
  - Tích hợp mục "Cài đặt tài khoản" vào menu người dùng trong `TopBar.tsx`.
  - Viết bộ unit test đạt 100% pass (39/39 tests backend, 13/13 tests frontend, 0 lint warnings/errors).
  - Cập nhật đầy đủ tài liệu API [docs/api/reference.md](file:///home/hotboyhust/project/taskflow/docs/api/reference.md), [docs/modules/auth.md](file:///home/hotboyhust/project/taskflow/docs/modules/auth.md), [docs/project/roadmap.md](file:///home/hotboyhust/project/taskflow/docs/project/roadmap.md).
- **Đã xong Bước 9 (Hỗ trợ Sắp xếp Thứ tự Tùy ý trên Kanban Board - Kanban Reorder)**:
  - Bổ sung trường `position Float @default(65536.0)` vào model `Task` trong schema Prisma và tạo migration SQL `backend/prisma/migrations/20261121000000_task_position/migration.sql` kèm index `(project_id, status, position)` tuân thủ quy tắc Expand/Contract.
  - Cập nhật `CreateTaskDto`, `UpdateTaskDto` và `TaskService`: hỗ trợ nhận `position`, tự động tính toán vị trí tiếp theo khi tạo task mới, và sắp xếp task theo `position asc, createdAt desc`.
  - Nâng cấp component `KanbanBoard.tsx`: áp dụng thuật toán Fractional Indexing (`(prevPos + nextPos) / 2`), hiển thị đường chỉ báo vị trí thả trực quan (`drop-before`, `drop-after`), hỗ trợ cả di chuyển giữa các cột trạng thái lẫn kéo đổi thứ tự ưu tiên trong cùng một cột.
  - Bổ sung bộ unit test `backend/src/tasks/task.service.spec.ts`, đạt 100% pass (36/36 tests backend, 13/13 tests frontend, 0 lint warnings/errors).
  - Cập nhật tài liệu: [docs/project/known-issues.md](file:///home/hotboyhust/project/taskflow/docs/project/known-issues.md) (đánh dấu giải quyết mục 3.2), [docs/project/roadmap.md](file:///home/hotboyhust/project/taskflow/docs/project/roadmap.md), [docs/api/reference.md](file:///home/hotboyhust/project/taskflow/docs/api/reference.md), [docs/modules/tasks.md](file:///home/hotboyhust/project/taskflow/docs/modules/tasks.md) và [docs/architecture/database.md](file:///home/hotboyhust/project/taskflow/docs/architecture/database.md).
- **Đã xong Bước 8 (Triển khai API Đổi mật khẩu chủ động POST /auth/change-password)**:
  - Xây dựng DTO `ChangePasswordDto` tại [backend/src/auth/dto/change-password.dto.ts](file:///home/hotboyhust/project/taskflow/backend/src/auth/dto/change-password.dto.ts) (`currentPassword`, `newPassword` tối thiểu 12 ký tự).
  - Triển khai phương thức `changePassword` trong `AuthService` với thuật toán Argon2id: kiểm tra mật khẩu hiện tại, chống trùng mật khẩu cũ, băm mật khẩu mới bằng Argon2id.
  - Tự động thu hồi toàn bộ các phiên làm việc khác (`auth_sessions.revokedAt = now()`) trong cùng transaction, chỉ duy trì phiên của thiết bị đang gọi thao tác (`sessionId` lấy từ JWT).
  - Áp dụng `AccessTokenGuard` và `ThrottlerGuard` bảo vệ endpoint tại `backend/src/auth/auth.controller.ts`.
  - Bổ sung hàm `changePassword` vào client `authApi` tại [frontend/src/api.ts](file:///home/hotboyhust/project/taskflow/frontend/src/api.ts).
  - Viết bộ unit test toàn diện cho cả service [backend/src/auth/auth.service.spec.ts](file:///home/hotboyhust/project/taskflow/backend/src/auth/auth.service.spec.ts) và controller [backend/src/auth/auth.controller.spec.ts](file:///home/hotboyhust/project/taskflow/backend/src/auth/auth.controller.spec.ts), đạt 100% pass (32/32 tests backend).
  - Cập nhật đầy đủ tài liệu API [docs/api/reference.md](file:///home/hotboyhust/project/taskflow/docs/api/reference.md), [docs/modules/auth.md](file:///home/hotboyhust/project/taskflow/docs/modules/auth.md), [docs/architecture/security.md](file:///home/hotboyhust/project/taskflow/docs/architecture/security.md), [docs/project/roadmap.md](file:///home/hotboyhust/project/taskflow/docs/project/roadmap.md) và [docs/project/progress.md](file:///home/hotboyhust/project/taskflow/docs/project/progress.md).
- **Đã xong Bước 7 (Bảo vệ Rate Limiting & Tự động quét thông báo TASK_DUE_SOON)**:
  - Cài đặt `@nestjs/throttler` bảo vệ rate limiting cho các route xác thực nhạy cảm (`POST /auth/register`, `POST /auth/login`), hỗ trợ cấu hình linh hoạt qua biến môi trường `AUTH_RATE_LIMIT_TTL` (mặc định 60.000 ms) và `AUTH_RATE_LIMIT_MAX` (mặc định 10 requests).
  - Cài đặt `@nestjs/schedule` và xây dựng `TaskDueSchedulerService` tại `backend/src/notifications/task-due-scheduler.service.ts` quét định kỳ các task sắp đến hạn trong vòng 24 giờ tới của các dự án đang hoạt động và tự động sinh thông báo in-app `TASK_DUE_SOON` tới người được giao (hoặc người tạo), tích hợp cơ chế deduplication ngăn chặn gửi trùng lặp trong 24 giờ.
  - Bổ sung bộ unit test toàn diện cho `AuthController` (`backend/src/auth/auth.controller.spec.ts`) và `TaskDueSchedulerService` (`backend/src/notifications/task-due-scheduler.service.spec.ts`), đạt 100% pass (27/27 tests backend).
- **Đã xong Bước 1 (Nền tảng: Overview, Architecture, Data Model)**:
  - Cập nhật [`docs/overview/product-overview.md`](overview/product-overview.md): Rà khớp mã nguồn, đưa Notification và Kanban vào chính thức, gắn nhãn hạ tầng.
  - Cập nhật [`docs/architecture/system-design.md`](architecture/system-design.md): Sơ đồ thành phần Mermaid chi tiết, phân lớp đơn hướng và ma trận hạ tầng.
  - Cập nhật [`docs/architecture/database.md`](architecture/database.md): ERD Mermaid 9 bảng, đối chiếu migration thật, 6 vòng đời trạng thái và 7 bất biến dữ liệu.
  - Tạo mới [`docs/architecture/decisions.md`](architecture/decisions.md): Ghi nhận ADR-001 (Frontend Caddy trên EC2 `[CHƯA LÀM]`) và ADR-002 (Đơn máy chủ EC2 + Postgres trên EBS gp3, không dùng RDS `[ĐÃ CÓ]`).
  - Tạo mới [`docs/project/known-issues.md`](project/known-issues.md): Điểm lệch `TASK_DUE_SOON`, S3 production `[CHƯA KIỂM CHỨNG]`, Kanban position.
  - Tạo mới [`docs/project/roadmap.md`](project/roadmap.md): Kế hoạch Email SES/MailHog `[CHƯA LÀM]`, scheduler `TASK_DUE_SOON` qua `@nestjs/schedule` `[CHƯA LÀM]`, Kanban position `[CHƯA LÀM]`, Recurring tasks.
- **Đã xong Bước 2 (Đặc tả các luồng hoạt động trọng yếu)**:
  - Tạo mới [`docs/architecture/flows.md`](architecture/flows.md): Đặc tả 5 luồng trọng yếu kèm Sequence Diagram Mermaid, file/hàm thật, nhánh lỗi, tác dụng phụ và dẫn chứng mã nguồn cho mọi khẳng định bảo mật.
- **Đã xong Bước 3 (Development, Modules & API Reference)**:
  - `development/`: Tạo mới [`docs/development/local-setup.md`](development/local-setup.md), [`docs/development/testing-guide.md`](development/testing-guide.md) và [`docs/development/conventions.md`](development/conventions.md) (quy ước code, checklist tính năng mới, checklist migration Expand/Contract).
  - `modules/`: Tạo mới đầy đủ các file đặc tả từng module backend gồm [`docs/modules/auth.md`](modules/auth.md), [`docs/modules/projects.md`](modules/projects.md), [`docs/modules/tasks.md`](modules/tasks.md), [`docs/modules/collaboration.md`](modules/collaboration.md), [`docs/modules/notifications.md`](modules/notifications.md) và [`docs/modules/health-and-telemetry.md`](modules/health-and-telemetry.md).
  - `api/`: Tạo mới [`docs/api/reference.md`](api/reference.md) với bảng danh mục đầy đủ toàn bộ endpoint từ controller thật.
- **Đã xong Bước 4 (Hoàn thiện Operations & Security Architecture)**:
  - `architecture/`: Tạo mới [`docs/architecture/security.md`](architecture/security.md) đặc tả sâu các tầng bảo mật: Argon2id, dual-token rotation, replay attack revocation, giới hạn cứng 30 ngày, RBAC, S3 presigned URL 3 bước, S3 security policies, IAM least-privilege, SSM SecureStrings và Trivy container scanning.
  - `operations/`: Tạo mới [`docs/operations/deployment.md`](operations/deployment.md) đặc tả chi tiết toàn bộ pipeline CI/CD, kịch bản `deploy-release.sh`, cơ chế rollback, triển khai Frontend Caddy (ADR-001) và sổ tay xử lý sự cố.
  - `operations/`: Tạo mới [`docs/operations/aws-infrastructure.md`](operations/aws-infrastructure.md) tổng hợp toàn diện kiến trúc đám mây AWS với 26 tài nguyên Terraform, cấu trúc bootstrap remote state trên S3 + DynamoDB lock, cấu hình EC2, EBS gp3, S3 buckets, ECR, IAM, Security Groups và dự toán chi phí.
- **Đã xong Bước 5 (Thiết kế lại toàn diện UI/UX & Tái cấu trúc Frontend)**:
  - Thiết kế mới toàn bộ giao diện theo chuẩn SaaS cao cấp (Linear, Notion, Asana style) với hệ thống Design System tokens hoàn chỉnh tại `frontend/src/styles.css`.
  - Giải quyết triệt để vấn đề Monolith Component `App.tsx` (1.505 dòng $\rightarrow$ 65 dòng), module hóa thành các component và page độc lập (`components/ui/`, `components/layout/`, `components/tasks/`, `components/dashboard/`, `components/members/`, `components/notifications/`, `pages/`).
  - Tạo mới tài liệu đặc tả luồng điều hướng UI/UX tại [`docs/architecture/ui-ux-navigation-flow.md`](architecture/ui-ux-navigation-flow.md) với sơ đồ Mermaid, bảng phân quyền RBAC và user journeys.
  - Bổ sung bộ test giao diện `frontend/src/redesign.test.tsx` (100% pass, 13/13 tests toàn frontend).
- **Đã xong Bước 6 (Củng cố Cấu hình Triển khai Production)**:
  - Cập nhật `deploy/compose.production.yaml`: Bổ sung cấu hình log rotation (`json-file`, `max-size: 10m`, `max-file: 3`) cho cả 3 service (`postgres`, `migrator`, `api`).
  - Bổ sung container healthcheck tự động cho service `api` sử dụng endpoint `/health/ready`.

## Việc cần kiểm tra sau release đầu tiên
- **Kiểm thử xác minh tích hợp S3 Production** `[CHƯA KIỂM CHỨNG]`: Tệp đính kèm cần được kiểm thử tải lên và tải xuống thực tế từ trình duyệt đến Amazon S3 production trên EC2 sau release đầu tiên.
  - *Lưu ý quan trọng*: Cấu hình CORS của S3 bucket (`infra/terraform/main.tf`) bắt buộc phải có `allowed_origins` khớp chính xác với domain thật của ứng dụng khi đưa vào vận hành.

## Kẹt
- Không có.

## File liên quan
- [`docs/README.md`](README.md)
- [`docs/STATE.md`](STATE.md)
- [`docs/architecture/ui-ux-navigation-flow.md`](architecture/ui-ux-navigation-flow.md)
- [`docs/project/known-issues.md`](project/known-issues.md)
- [`docs/project/progress.md`](project/progress.md)
- [`deploy/compose.production.yaml`](../deploy/compose.production.yaml)
- [`frontend/src/App.tsx`](../frontend/src/App.tsx)
- [`frontend/src/styles.css`](../frontend/src/styles.css)
