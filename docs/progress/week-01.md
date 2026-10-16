# Báo cáo tiến độ 11/10/2026 đến 17/10/2026

## Đã thực hiện

- Thiết lập khung repository và quy ước làm việc qua pull request.
- Khởi tạo backend bằng NestJS, có cấu hình ứng dụng, cấu hình môi trường và Prisma service kết nối PostgreSQL.
- Tạo Prisma schema thử nghiệm cho `User` cùng migration khởi tạo bảng `users`.
- Tạo Docker Compose cho PostgreSQL, MailHog và SeaweedFS làm S3 emulator dùng trong môi trường local.
- Đóng gói backend bằng Docker multi-stage, chạy non-root, sinh Prisma Client khi build và kiểm tra liveness tại `/health/live`; Compose chờ PostgreSQL healthy trước khi khởi chạy API.
- Endpoint `/health/ready` kiểm tra truy vấn PostgreSQL và trả về trạng thái unavailable khi database không kết nối được.
- Có unit test và e2e test mẫu cho endpoint gốc của backend.

## Chưa triển khai

- Frontend và các API nghiệp vụ.
- Terraform cho tài nguyên AWS, quy trình bootstrap state, cấu hình ECR và triển khai EC2.
- GitHub Actions để build, push image và triển khai.

## Ghi chú

- Prisma schema và migration hiện là nền tảng thử nghiệm, chưa phải thiết kế dữ liệu cuối cùng.
- Các thư mục `frontend/`, `deploy/` và `infra/terraform/` hiện chỉ được giữ chỗ; chưa có triển khai bên trong.
- Backend đã qua `npm test -- --runInBand src/app.controller.spec.ts` (4 tests), `npm run lint`, `npm run build`, `npm run db:generate && npm run test:e2e -- --runInBand` (3 tests), `docker compose config --quiet` và `docker compose up -d --build api`; hai endpoint health đã được xác minh qua HTTP trong Compose.
