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

## 3. Quét Thông báo Công việc Sắp đến hạn (TASK_DUE_SOON) `[CHƯA LÀM]`

- **Mục tiêu**: Tự động gửi thông báo in-app nhắc nhở khi công việc sắp đến hạn hoàn thành (loại enum `TASK_DUE_SOON` đã có trong migration `backend/prisma/migrations/20261101000000_notifications/`).
- **Hướng dự kiến**: Sử dụng cron job nội bộ trong NestJS (`@nestjs/schedule`) để quét định kỳ các task có `dueAt` gần kề. Do hệ thống hiện chạy trên một instance duy nhất (theo ADR-002), cron nội bộ đáp ứng tốt mà không lo rủi ro chạy trùng lặp giữa nhiều node.

---

## 4. Quản lý Tài khoản & Hồ sơ Cá nhân `[CHƯA LÀM]`

- **Chức năng dự kiến**:
  - Đổi mật khẩu chủ động (`POST /auth/change-password`).
  - Quên mật khẩu và gửi token khôi phục mật khẩu qua Email.
  - Cập nhật thông tin cá nhân (tên hiển thị, avatar).

---

## 4. Quản lý Cờ tính năng (Feature Flags) `[CHƯA LÀM]`

- **Mục tiêu**: Cho phép bật/tắt linh hoạt các module hoặc tính năng thử nghiệm tại runtime mà không cần triển khai lại mã nguồn.
- **Thiết kế dự kiến**: Quản lý cờ tính năng trong database hoặc SSM Parameter Store, cung cấp Guard cho API và hook cho frontend.

---

## 5. Nâng cấp Trải nghiệm Giao diện Frontend `[CHƯA LÀM]`

- **Tách module mã nguồn `App.tsx`**: Tái cấu trúc thành các thư mục chuẩn `components/`, `pages/`, `hooks/`, `context/` để giảm độ phức tạp của component chính.
- **Hỗ trợ sắp xếp thứ tự tùy ý trên Kanban Board**: Bổ sung trường `position` vào bảng `tasks` để cho phép người dùng kéo đổi thứ tự ưu tiên trong cùng một cột trạng thái.
- **Tìm kiếm và bộ lọc nâng cao**: Tìm kiếm từ khóa theo tiêu đề, lọc đa điều kiện theo người thực hiện và khoảng ngày hết hạn.
- **Thông báo Toast**: Hiển thị popup thông báo ngắn phản hồi trạng thái thành công/lỗi thay cho thông báo tĩnh.
- **Thanh tiến trình tải tệp**: Hiển thị phần trăm tiến độ khi upload tệp đính kèm kích thước lớn lên S3.

---

## 6. Hạ tầng Vận hành, DevOps & Bảo mật

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
- **Rate Limiting & API Documentation** `[CHƯA LÀM]`:
  - Cài đặt `@nestjs/throttler` bảo vệ endpoint xác thực (`/auth/login`, `/auth/register`).
  - Tích hợp tài liệu Swagger / OpenAPI tại endpoint `/api-docs`.
