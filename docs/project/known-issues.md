# Vấn đề Tồn đọng & Điểm lệch Kỹ thuật (Known Issues)

Tài liệu này ghi nhận các vấn đề tồn đọng, nợ kỹ thuật (technical debt) và các điểm sai lệch giữa mã nguồn thực tế, lược đồ cơ sở dữ liệu (migration) và tài liệu hệ thống TaskFlow. Nội dung được đối chiếu trực tiếp từ mã nguồn backend, frontend và các migration của database.

---

## 1. Điểm lệch giữa Database Schema và Mã nguồn Nghiệp vụ

### 1.1. Enum `TASK_DUE_SOON` chưa có tiến trình kích hoạt — [ĐÃ GIẢI QUYẾT]
- **Giải pháp thực hiện**: Đã cài đặt `@nestjs/schedule` và xây dựng `TaskDueSchedulerService` tại `backend/src/notifications/task-due-scheduler.service.ts`:
  - Thiết lập cron job `@Cron(CronExpression.EVERY_30_MINUTES)` quét các task chưa hoàn thành (`status != DONE`), chưa bị xóa (`deletedAt = null`), thuộc dự án chưa lưu trữ (`project.archivedAt = null`) và có `dueAt` trong vòng 24 giờ tới (`gte: now, lte: now + 24h`).
  - Gửi thông báo loại `TASK_DUE_SOON` tới người được giao (`assigneeId`) hoặc người tạo (`createdById`).
  - Áp dụng cơ chế deduplication: kiểm tra thông báo `TASK_DUE_SOON` cho cùng task trong 24 giờ qua để ngăn spam thông báo.
  - Bổ sung unit test toàn diện `task-due-scheduler.service.spec.ts` (100% pass).

---

## 2. Nợ kỹ thuật Module Thông báo (Notifications)

### 2.1. Chưa có kênh thông báo thời gian thực (Real-time Push)
- **Hiện trạng xác minh**: `backend/src/notifications/notification.controller.ts` cung cấp REST API (`GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`). Giao diện frontend tại `NotificationBell.tsx` sử dụng cơ chế polling định kỳ 20 giây.
- **Hạn chế**: Chưa có kết nối WebSocket (NestJS WebSockets Gateway) hoặc Server-Sent Events (SSE) để cập nhật tức thời khi có thông báo mới mà không cần polling.

---

## 3. Nợ kỹ thuật Frontend

### 3.1. File `App.tsx` đóng vai trò Monolith Component — [ĐÃ GIẢI QUYẾT]
- **Hiện trạng**: Toàn bộ tệp `frontend/src/App.tsx` cũ (1.505 dòng) đã được tái cấu trúc triệt để thành cấu trúc component module hóa chuẩn SaaS:
  - `src/components/icons.tsx`: Thư viện icon Lucide SVG chuẩn hóa.
  - `src/components/ui/`: Các thành phần nguyên tử dùng lại (`Button`, `Avatar`, `Badge`, `Modal`, `ConfirmModal`, `EmptyState`).
  - `src/components/layout/`: `AppLayout`, `Sidebar`, `TopBar`.
  - `src/components/notifications/`: `NotificationBell`.
  - `src/components/projects/`: `ProjectCard`, `CreateProjectModal`.
  - `src/components/workspace/`: `ProjectHeader`, `WorkspaceTabs`.
  - `src/components/tasks/`: `TaskRow`, `TaskCreateForm`, `TaskDetailsPanel`.
  - `src/components/dashboard/`: `DashboardPanel`.
  - `src/components/members/`: `MembersPanel`.
  - `src/pages/`: `AuthPage`, `ProjectsPage`, `WorkspacePage`.
  - `src/App.tsx`: Rút gọn còn 65 dòng, chỉ đảm nhiệm routing và route guards.
- **Kết quả**: Mã nguồn sạch, dễ bảo trì, re-render tối ưu, bộ test `redesign.test.tsx` đạt 100% pass.

---

## 4. Kiểm chứng Tích hợp Object Storage trên Production

### 4.1. Luồng upload/download S3 thực tế chưa kiểm thử end-to-end trên production
- **Hiện trạng xác minh**: Backend đã triển khai `backend/src/collaboration/s3-storage.service.ts` sử dụng AWS SDK `@aws-sdk/client-s3` và `@aws-sdk/s3-request-presigner`. Môi trường local sử dụng container SeaweedFS. Terraform đã tạo S3 bucket `[ĐÃ CÓ]`.
- **Hiện trạng `[CHƯA KIỂM CHỨNG]`**: Việc upload trực tiếp từ trình duyệt lên S3 bucket production qua presigned URL chưa được kiểm chứng thực tế cùng với chính sách CORS bucket và chứng chỉ HTTPS công khai. Cần kiểm tra sau release đầu tiên và đảm bảo `allowed_origins` khớp với domain production thật.

---

## 5. An toàn thông tin và Bảo vệ API

### 5.1. Thiếu Rate Limiting trên các endpoint nhạy cảm — [ĐÃ GIẢI QUYẾT]
- **Giải pháp thực hiện**: Đã cài đặt `@nestjs/throttler` và cấu hình bảo vệ rate limiting tại `backend/src/app.module.ts` và `backend/src/auth/auth.controller.ts`:
  - `ThrottlerModule.forRootAsync` hỗ trợ tùy biến qua biến môi trường `AUTH_RATE_LIMIT_TTL` (mặc định 60.000 ms) và `AUTH_RATE_LIMIT_MAX` (mặc định 10 requests).
  - Áp dụng `ThrottlerGuard` trực tiếp lên endpoint nhạy cảm `POST /auth/register` và `POST /auth/login` để ngăn chặn tấn công brute-force và lạm dụng tài nguyên.
  - Bổ sung bộ unit test `backend/src/auth/auth.controller.spec.ts` kiểm thử metadata guard và logic phiên làm việc.

---

## 6. Cấu hình Container Môi trường Production (`deploy/compose.production.yaml`)

### 6.1. Thiếu cấu hình Giới hạn dung lượng Log (Log Rotation) — [ĐÃ GIẢI QUYẾT]
- **Giải pháp thực hiện**: Đã bổ sung khối cấu hình `logging` chuẩn Docker cho toàn bộ 3 service (`postgres`, `migrator`, `api`) trong `deploy/compose.production.yaml`:
  ```yaml
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
  ```
- **Kết quả**: Ngăn chặn hoàn toàn rủi ro tràn dung lượng ổ đĩa EC2 do log container không giới hạn.

### 6.2. Container API chưa có cấu hình Healthcheck của Docker — [ĐÃ GIẢI QUYẾT]
- **Giải pháp thực hiện**: Đã bổ sung cấu hình `healthcheck` cho service `api` trong `deploy/compose.production.yaml`:
  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "node -e 'fetch(\"http://127.0.0.1:3000/health/ready\").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'"]
    interval: 10s
    timeout: 3s
    retries: 3
    start_period: 15s
  ```
- **Kết quả**: Docker daemon có thể chủ động theo dõi và tự động phục hồi container `api` khi tiến trình gặp lỗi hoặc mất kết nối database tại runtime.
