# Báo cáo tiến độ 11/10/2026 đến 17/10/2026

## Đã thực hiện

- Thiết lập khung repository và quy ước làm việc qua pull request.
- Khởi tạo backend bằng NestJS, có cấu hình ứng dụng, cấu hình môi trường và Prisma service kết nối PostgreSQL.
- Tạo Prisma schema thử nghiệm cho `User` cùng migration khởi tạo bảng `users`.
- Tạo Docker Compose cho PostgreSQL, MailHog và SeaweedFS làm S3 emulator dùng trong môi trường local.
- Đóng gói backend bằng Docker multi-stage, chạy non-root, sinh Prisma Client khi build và kiểm tra liveness tại `/health/live`; Compose chờ PostgreSQL healthy trước khi khởi chạy API.
- Endpoint `/health/ready` kiểm tra truy vấn PostgreSQL và trả về trạng thái unavailable khi database không kết nối được.
- Endpoint `/version` trả về `gitSha` và `buildTime` từ biến môi trường `GIT_SHA` và `BUILD_TIME`.
- Có unit test và e2e test mẫu cho endpoint gốc của backend.
- CI workflow đã được thêm với ba job độc lập: `test`, `e2e` (PostgreSQL 16 + migrate deploy) và `image` (build + Trivy). Kết quả GitHub Actions đang chờ; chưa ghi nhận là CI đã đạt.

## Chưa triển khai

- Frontend và các API nghiệp vụ.
- Terraform cho tài nguyên AWS, quy trình bootstrap state, cấu hình ECR và triển khai EC2.
- Triển khai lên EC2 và xác minh trong deployment.
- CI chưa có kết quả xanh trên PR; branch protection và required checks chưa được xác nhận.

## Ghi chú

- Prisma schema và migration hiện là nền tảng thử nghiệm, chưa phải thiết kế dữ liệu cuối cùng.
- Các thư mục `frontend/`, `deploy/` và `infra/terraform/` hiện chỉ được giữ chỗ; chưa có triển khai bên trong.

## Ma trận trạng thái

| Hạng mục | Trạng thái hiện tại | Deployment |
|---|---|---|
| Backend, health/version endpoints, PostgreSQL và Docker image | Tested trên local | Chưa xác minh trên EC2 |
| CI: `test`, `e2e`, `image` | Đã cấu hình; đang chờ workflow run trên PR #7 | Không áp dụng |
| Terraform và CD lên EC2 | Chưa triển khai | Chưa xác minh |

- Backend đã qua typecheck (`npm run typecheck`), lint, unit test (6), Prisma generate, `prisma migrate deploy` (không còn migration chờ), e2e (4), build, kiểm tra Compose và chạy trong Compose.
- Trạng thái hiện tại: **Tested trên local**, chưa **Verified in Deployment**. Bằng chứng local (16/10/2026):
  - `docker compose exec -T api id` → `uid=1000(node) gid=1000(node) groups=1000(node)`.
  - `docker compose exec -T api ls -la dist/generated/prisma` → có `client.js`, `internal/` và `models/`; client Prisma 7 được biên dịch cùng source.
  - `docker images taskflow-api` → `taskflow-api:latest`, ID `ebddf39f810e`, content size `183MB`.
  - `docker history --no-trunc taskflow-api | grep -iE 'postgresql://|secret|password'` → không có kết quả khớp.
  - `docker inspect taskflow-api-1 --format '{{json .State.Health}}'` → trạng thái `healthy`, `FailingStreak=0` sau khi healthcheck chạy.
  - `curl http://127.0.0.1:3000/health/live`, `/health/ready` và `/version` → lần lượt trả `{"status":"ok"}`, `{"status":"ok"}` và `{"gitSha":"local-verified","buildTime":"2026-10-16T03:00:00Z"}`.
  - `docker build --target migrator --tag taskflow-migrator:local ./backend` → build thành công.
- GitHub Actions đã được cấu hình; kết quả CI trên PR đang chờ. Branch protection chưa được bật.
- Chưa có xác minh trên EC2; các bằng chứng trên chỉ phản ánh môi trường local.
