# Vấn đề Tồn đọng & Điểm lệch Kỹ thuật (Known Issues)

Tài liệu này ghi nhận các vấn đề tồn đọng, nợ kỹ thuật (technical debt) và các điểm sai lệch giữa mã nguồn thực tế, lược đồ cơ sở dữ liệu (migration) và tài liệu hệ thống TaskFlow. Nội dung được đối chiếu trực tiếp từ mã nguồn backend, frontend và các migration của database.

---

## 1. Điểm lệch giữa Database Schema và Mã nguồn Nghiệp vụ

### 1.1. Enum `TASK_DUE_SOON` chưa có tiến trình kích hoạt
- **Hiện trạng xác minh**:
  - Trong migration `backend/prisma/migrations/20261101000000_notifications/migration.sql` và schema `backend/prisma/schema.prisma`, enum `notification_type` định nghĩa 4 giá trị: `TASK_ASSIGNED`, `TASK_STATUS_CHANGED`, `TASK_COMMENT_CREATED`, `TASK_DUE_SOON`.
  - Trong mã nguồn backend, `NotificationService` được tích hợp vào `backend/src/tasks/task.service.ts` (khi giao task, đổi trạng thái) và `backend/src/collaboration/collaboration.service.ts` (khi tạo comment mới).
  - Hoàn toàn **không có bất kỳ service, scheduler hay cron job nào** quét các task sắp đến hạn để gọi `createNotification` với loại `TASK_DUE_SOON`.
- **Hướng xử lý dự kiến**: Xây dựng một module scheduler (hoặc NestJS cron job) quét định kỳ các task có `dueAt` trong vòng 24 giờ tới và sinh thông báo nhắc nhở.

---

## 2. Nợ kỹ thuật Module Thông báo (Notifications)

### 2.1. Chưa có kênh thông báo thời gian thực (Real-time Push)
- **Hiện trạng xác minh**: `backend/src/notifications/notification.controller.ts` cung cấp REST API (`GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`). Giao diện frontend tại `frontend/src/App.tsx` chỉ cập nhật dữ liệu khi người dùng mở dropdown hoặc tải lại trang.
- **Hạn chế**: Chưa có kết nối WebSocket (NestJS WebSockets Gateway) hoặc Server-Sent Events (SSE) để cập nhật tức thời khi có thông báo mới mà không cần thao tác reload.

---

## 3. Nợ kỹ thuật Frontend & Giao diện Kanban

### 3.1. File `App.tsx` đóng vai trò Monolith Component
- **Hiện trạng xác minh**: Tệp `frontend/src/App.tsx` có quy mô hơn 1.200 dòng, tích hợp toàn bộ router, auth state, project workspace, modal task, modal bình luận, tệp đính kèm, chuông thông báo và bảng kéo-thả Kanban.
- **Rủi ro**: Khó mở rộng, khó bảo trì và dễ gây re-render không mong muốn.
- **Hướng xử lý**: Tái cấu trúc phân tách thành các thư mục chuẩn: `components/kanban/`, `components/notifications/`, `components/tasks/`, `pages/`, `hooks/`.

### 3.2. Bảng Kanban chưa hỗ trợ sắp xếp thứ tự tùy ý trong cùng một cột
- **Hiện trạng xác minh**: Giao diện Kanban tại `frontend/src/App.tsx` hỗ trợ kéo-thả thẻ công việc giữa 4 cột trạng thái (`TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`) và gọi `api.updateTask` để đổi trạng thái. Tuy nhiên, bảng `tasks` trong database không có cột `position` hay `order_index`.
- **Hạn chế**: Thứ tự các card trong một cột phụ thuộc hoàn toàn vào sắp xếp thời gian tạo (`createdAt desc`), người dùng không thể kéo đổi vị trí ưu tiên giữa các task trong cùng một cột.

---

## 4. Kiểm chứng Tích hợp Object Storage trên Production

### 4.1. Luồng upload/download S3 thực tế chưa kiểm thử end-to-end trên production
- **Hiện trạng xác minh**: Backend đã triển khai `backend/src/collaboration/s3-storage.service.ts` sử dụng AWS SDK `@aws-sdk/client-s3` và `@aws-sdk/s3-request-presigner`. Môi trường local sử dụng container SeaweedFS. Terraform đã tạo S3 bucket `[ĐÃ CÓ]`.
- **Hiện trạng `[CHƯA KIỂM CHỨNG]`**: Việc upload trực tiếp từ trình duyệt lên S3 bucket production qua presigned URL chưa được kiểm chứng thực tế cùng với chính sách CORS bucket và chứng chỉ HTTPS công khai. Cần kiểm tra sau release đầu tiên và đảm bảo `allowed_origins` khớp với domain production thật.

---

## 5. An toàn thông tin và Bảo vệ API

### 5.1. Thiếu Rate Limiting trên các endpoint nhạy cảm
- **Hiện trạng xác minh**: Backend NestJS chưa cài đặt `@nestjs/throttler`. Các route xác thực như `POST /auth/login` và `POST /auth/register` chưa có cơ chế hạn chế tần suất gọi, tiềm ẩn rủi ro brute-force mật khẩu.


---

## 6. Cấu hình Container Môi trường Production (`deploy/compose.production.yaml`)

### 6.1. Thiếu cấu hình Giới hạn dung lượng Log (Log Rotation)
- **Hiện trạng xác minh**: Trong `deploy/compose.production.yaml`, cả 3 service (`postgres`, `migrator`, `api`) đều không khai báo khối `logging` (như `driver: "json-file"`, `options: { max-size: "10m", max-file: "3" }`).
- **Rủi ro**: Docker mặc định ghi log không giới hạn dung lượng ra ổ đĩa root của máy chủ EC2. Khi hệ thống hoạt động liên tục trong thời gian dài, file log container có thể làm đầy dung lượng ổ đĩa, gây treo máy chủ.
- **Hướng xử lý**: Bổ sung cấu hình `logging` kèm giới hạn `max-size` và `max-file` cho từng service trong `deploy/compose.production.yaml`.

### 6.2. Container API chưa có cấu hình Healthcheck của Docker
- **Hiện trạng xác minh**: Service `postgres` có `healthcheck` đầy đủ (`pg_isready`), nhưng service `api` trong `deploy/compose.production.yaml` hoàn toàn chưa có khối `healthcheck`. Mặc dù script `deploy/deploy-release.sh` có kiểm tra `curl -f http://127.0.0.1:3000/health/ready` một lần duy nhất tại thời điểm triển khai, Docker daemon không thể tự phát hiện nếu tiến trình API bị treo (deadlock/unresponsive) tại runtime sau đó để tự động khởi động lại.
- **Hướng xử lý**: Bổ sung `healthcheck` cho service `api` sử dụng `curl` hoặc `node` gọi tới `/health/ready`.
