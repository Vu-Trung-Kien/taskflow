# Lộ trình Phát triển & Hoàn thiện Hệ thống (Roadmap)

Tài liệu này ghi nhận kế hoạch phát triển các tính năng nghiệp vụ, nâng cấp trải nghiệm người dùng và hoàn thiện hạ tầng vận hành của dự án TaskFlow. Mọi hạng mục đều được gắn nhãn trạng thái cụ thể dựa trên việc rà soát thực tế mã nguồn và hạ tầng.

---

## 1. Dịch vụ Email (MailHog / AWS SES) `[CHƯA LÀM]`

- **Bối cảnh hiện tại**:
  - Tệp cấu hình `compose.yaml` ở môi trường local đã có container `mailhog:v1.0.1` lắng nghe cổng SMTP 1025 và Web UI 8025 `[ĐÃ CÓ]`.
  - Trong backend NestJS (`backend/src/`), hiện tại **chưa có `MailModule`** hoặc bất kỳ dịch vụ gửi thư nào được khởi tạo `[CHƯA LÀM]`.
- **Kế hoạch triển khai**:
  - Xây dựng `MailModule` và `MailService` trong backend NestJS.
  - Hỗ trợ driver linh hoạt: SMTP nội bộ kết nối tới MailHog khi chạy local dev; chuyển sang AWS SES (Simple Email Service) khi chạy production.
  - Áp dụng gửi email thông báo khi: được phân công task quan trọng, nhắc nhở trước hạn hoàn thành và quy trình đặt lại mật khẩu an toàn.

---

## 2. Công việc lặp định kỳ (Recurring Tasks) `[CHƯA LÀM]`

- **Mục tiêu**: Hỗ trợ tự động lặp lại các công việc định kỳ theo chu kỳ (Hằng ngày, Hằng tuần, Hằng tháng).
- **Thiết kế dự kiến**:
  - Thêm bảng hoặc cột cấu hình quy tắc lặp (`cron_expression` hoặc `recurrence_rule`, múi giờ UTC, xử lý ngày cuối tháng).
  - Tích hợp NestJS Scheduler (`@nestjs/schedule`) hoặc tiến trình nền để tự động sinh instance task mới khi tới chu kỳ hoặc khi task kỳ trước hoàn thành.

---

## 3. Quét Thông báo Công việc Sắp đến hạn (TASK_DUE_SOON) `[ĐÃ HOÀN TẤT]`

- **Mục tiêu**: Tự động gửi thông báo in-app nhắc nhở khi công việc sắp đến hạn hoàn thành (loại enum `TASK_DUE_SOON` đã có trong migration `backend/prisma/migrations/20261101000000_notifications/`).
- **Hiện trạng triển khai**:
  - Đã tích hợp `@nestjs/schedule` và xây dựng `TaskDueSchedulerService` tại `backend/src/notifications/task-due-scheduler.service.ts`.
  - Cron job quét định kỳ 30 phút một lần các công việc chưa hoàn tất có `dueAt` trong vòng 24 giờ tới và gửi thông báo `TASK_DUE_SOON` cho người được giao hoặc người tạo.
  - Tích hợp cơ chế deduplication ngăn gửi thông báo trùng lặp trong 24 giờ. Đạt 100% pass unit tests.

---

## 4. Quản lý Tài khoản & Hồ sơ Cá nhân

- **Chức năng đã hoàn thành**:
  - Đổi mật khẩu chủ động (`POST /auth/change-password`) `[ĐÃ HOÀN TẤT]`: Xác thực Argon2id, chống trùng mật khẩu, băm Argon2id và thu hồi các phiên đăng nhập khác.
- **Chức năng tiếp tục phát triển**:
  - Quên mật khẩu và gửi token khôi phục mật khẩu qua Email `[CHƯA LÀM]`.
  - Cập nhật thông tin cá nhân (tên hiển thị, avatar) `[CHƯA LÀM]`.

---

## 4. Quản lý Cờ tính năng (Feature Flags) `[CHƯA LÀM]`

- **Mục tiêu**: Cho phép bật/tắt linh hoạt các module hoặc tính năng thử nghiệm tại runtime mà không cần triển khai lại mã nguồn.
- **Thiết kế dự kiến**: Quản lý cờ tính năng trong database hoặc SSM Parameter Store, cung cấp Guard cho API và hook cho frontend.

---

## 5. Hạ tầng Vận hành, DevOps & Bảo mật

- **Triển khai Frontend Production bằng Caddy** `[CHƯA LÀM]`:
  - Đóng gói bản build static của React.
  - Cấu hình Caddy chạy trong Docker Compose trên cùng EC2 để phục vụ static build và làm reverse proxy `/api` sang backend NestJS.
- **Cấu hình Domain & HTTPS tự động** `[CHƯA LÀM]`:
  - Cấu hình domain công khai trỏ về IP của máy chủ EC2.
  - Kích hoạt tính năng tự động cấp chứng chỉ TLS qua Let's Encrypt của Caddy.
- **Tự động sao lưu Database lên S3 & Diễn tập Khôi phục** `[CHƯA LÀM]`:
  - Thiết lập cron job hoặc systemd service chạy `pg_dump` định kỳ hàng ngày, nén và tải lên S3 bucket backup đã tạo bằng Terraform.
  - Thiết lập lifecycle policy trên S3 bucket để xóa backup cũ theo số ngày quy định.
  - Xây dựng quy trình và kịch bản diễn tập khôi phục dữ liệu (DR Drill).
- **Giám sát & Cảnh báo (Monitoring & Alerting)** `[CHƯA LÀM]`:
  - Expose endpoint Prometheus metrics `/metrics` từ backend NestJS.
  - Cấu hình CloudWatch Agent hoặc Prometheus/Grafana thu thập chỉ số CPU, RAM, Disk, latency và connection pool.
  - Cấu hình CloudWatch Alarms gửi cảnh báo khi hệ thống gặp sự cố.
- **Rate Limiting & API Documentation**:
  - Cài đặt `@nestjs/throttler` bảo vệ endpoint xác thực (`/auth/login`, `/auth/register`) `[ĐÃ HOÀN TẤT]`.
  - Tích hợp tài liệu Swagger / OpenAPI tại endpoint `/api-docs` `[CHƯA LÀM]`.
