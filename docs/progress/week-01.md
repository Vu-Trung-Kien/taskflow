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
- CI workflow có ba job độc lập: `test`, `e2e` (PostgreSQL 16 + migrate deploy) và `image` (build + Trivy); cả ba đã đạt trên PR #7.
- Terraform bootstrap state và AWS foundation đã được viết, qua kiểm tra định dạng/validate local và CI `test`, `e2e`, `image` trên PR #8; AWS chưa được plan/apply.

## Chưa triển khai

- Frontend và các API nghiệp vụ.
- Apply Terraform vào AWS, cấu hình ECR và triển khai EC2.
- Triển khai lên EC2 và xác minh trong deployment.
- Chưa xác minh backend trên EC2.

## Ghi chú

- Prisma schema và migration hiện là nền tảng thử nghiệm, chưa phải thiết kế dữ liệu cuối cùng.
- Các thư mục `frontend/`, `deploy/` và `infra/terraform/` hiện chỉ được giữ chỗ; chưa có triển khai bên trong.

## Ma trận trạng thái

| Hạng mục | Trạng thái hiện tại | Deployment |
|---|---|---|
| Backend, health/version endpoints, PostgreSQL và Docker image | Tested trên local | Chưa xác minh trên EC2 |
| CI: `test`, `e2e`, `image` | Đạt trên PR #7; [workflow run 38846004509](https://github.com/Vu-Trung-Kien/taskflow/actions/runs/38846004509) | Không áp dụng |
| Bảo vệ nhánh `main` | Đã bật; PR bắt buộc và yêu cầu `test`, `e2e`, `image` | Không áp dụng |
| Terraform AWS foundation | Code trong PR #8; `fmt`, `validate`, cloud-init syntax và CI đạt; chưa chạy AWS plan/apply | Chưa xác minh |
| CD lên EC2 | Chưa triển khai | Chưa xác minh |

- Backend đã qua typecheck (`npm run typecheck`), lint, unit test (6), Prisma generate, `prisma migrate deploy` (không còn migration chờ), e2e (4), build, kiểm tra Compose và chạy trong Compose.
- Trạng thái hiện tại: **Tested trên local**, chưa **Verified in Deployment**. Bằng chứng local (16/10/2026):
  - `docker compose exec -T api id` → `uid=1000(node) gid=1000(node) groups=1000(node)`.
  - `docker compose exec -T api ls -la dist/generated/prisma` → có `client.js`, `internal/` và `models/`; client Prisma 7 được biên dịch cùng source.
  - `docker images taskflow-api` → `taskflow-api:latest`, ID `a7487724150c`, content size `186MB`.
  - `docker history --no-trunc taskflow-api | grep -iE 'postgresql://|secret|password'` → không có kết quả khớp.
  - `docker inspect taskflow-api-1 --format '{{json .State.Health}}'` → trạng thái `healthy`, `FailingStreak=0` sau khi healthcheck chạy.
  - `curl http://127.0.0.1:3000/health/live`, `/health/ready` và `/version` → lần lượt trả `{"status":"ok"}`, `{"status":"ok"}` và `{"gitSha":"local-verified","buildTime":"2026-10-16T03:12:00Z"}`.
  - `docker build --target migrator --tag taskflow-migrator:local ./backend` → build thành công.
- CI run 38846004509 trên PR #7 xanh với ba job `test`, `e2e`, `image`; PR #7 đã merge vào `main`. Branch protection yêu cầu đúng ba status checks.
- CI run 38846749487 trên PR #8 xanh với ba job `test`, `e2e`, `image`.
- Terraform có hai root riêng: bootstrap state bucket và AWS foundation. `terraform fmt -check -recursive infra/bootstrap infra/terraform`, `terraform -chdir=infra/bootstrap validate`, `terraform -chdir=infra/terraform validate` và kiểm tra cú pháp cloud-init đã đạt local; chưa xác thực plan với AWS, chưa apply, và chưa có deployment evidence.
- Chưa có xác minh trên EC2; các bằng chứng trên chỉ phản ánh môi trường local.
