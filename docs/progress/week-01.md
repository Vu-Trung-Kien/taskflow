# Báo cáo tiến độ 11/10/2026 đến 17/10/2026

## Đã thực hiện

- Thiết lập khung repository và quy ước làm việc qua pull request.
- Khởi tạo backend bằng NestJS, có cấu hình ứng dụng, cấu hình môi trường và Prisma service kết nối PostgreSQL.
- Tạo Prisma schema thử nghiệm cho `User` cùng migration khởi tạo bảng `users`.
- Tạo Docker Compose cho PostgreSQL, MailHog và SeaweedFS làm S3 emulator dùng trong môi trường local.
- Có unit test và e2e test mẫu cho endpoint gốc của backend.

## Chưa triển khai

- Endpoint `/health/live` và `/health/ready`.
- Đóng gói/chạy API trong Docker Compose.
- Frontend và các API nghiệp vụ.
- Terraform cho tài nguyên AWS, quy trình bootstrap state, cấu hình ECR và triển khai EC2.
- GitHub Actions để build, push image và triển khai.

## Ghi chú

- Prisma schema và migration hiện là nền tảng thử nghiệm, chưa phải thiết kế dữ liệu cuối cùng.
- Các thư mục `frontend/`, `deploy/` và `infra/terraform/` hiện chỉ được giữ chỗ; chưa có triển khai bên trong.
- Backend đã qua unit test (`npm test -- --runInBand src/app.controller.spec.ts`), lint (`npm run lint`) và build (`npm run build`).
