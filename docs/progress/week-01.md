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
- Đã viết Terraform bootstrap cho state và nền tảng AWS; PR #8 đã merge vào `main`; kiểm tra định dạng/xác thực local cùng CI `test`, `e2e`, `image` đều đạt. Chưa chạy plan/apply trên AWS.

## Chưa triển khai

- Frontend và các API nghiệp vụ.
- Áp dụng Terraform trên AWS, cấu hình ECR và triển khai EC2.
- Triển khai lên EC2 và xác minh trong môi trường triển khai.
- Chưa xác minh backend trên EC2.

## Ghi chú

- Prisma schema và migration hiện là nền tảng thử nghiệm, chưa phải thiết kế dữ liệu cuối cùng.
- Các thư mục `frontend/` và `deploy/` hiện chỉ được giữ chỗ; chưa có triển khai bên trong.

## Ma trận trạng thái

| Hạng mục | Trạng thái hiện tại | Môi trường triển khai |
|---|---|---|
| Backend, endpoint health/version, PostgreSQL và Docker image | Đã kiểm thử local | Chưa xác minh trên EC2 |
| CI: `test`, `e2e`, `image` | Đạt trên PR #7; [lần chạy workflow 38846004509](https://github.com/Vu-Trung-Kien/taskflow/actions/runs/38846004509) | Không áp dụng |
| Bảo vệ nhánh `main` | Đã bật; bắt buộc dùng PR và yêu cầu các bước kiểm tra `test`, `e2e`, `image` | Không áp dụng |
| Nền tảng AWS bằng Terraform | PR #8 đã merge vào `main`; `fmt`, `validate`, cú pháp cloud-init và CI đạt. Người dùng báo đã tạo state bucket và IAM cho operator; chưa xác minh độc lập, chưa chạy plan/apply | Chưa xác minh |
| CD lên EC2 | Chưa triển khai | Chưa xác minh |

- Backend đã qua kiểm tra kiểu (`npm run typecheck`), lint, unit test (6), tạo Prisma Client, `prisma migrate deploy` (không còn migration chờ), e2e (4), build, kiểm tra Compose và chạy trong Compose.
- Trạng thái hiện tại: **Đã kiểm thử local**, chưa **Xác minh trên môi trường triển khai**. Bằng chứng local (16/10/2026):
  - `docker compose exec -T api id` → `uid=1000(node) gid=1000(node) groups=1000(node)`.
  - `docker compose exec -T api ls -la dist/generated/prisma` → có `client.js`, `internal/` và `models/`; client Prisma 7 được biên dịch cùng source.
  - `docker images taskflow-api` → `taskflow-api:latest`, ID `a7487724150c`, content size `186MB`.
  - `docker history --no-trunc taskflow-api | grep -iE 'postgresql://|secret|password'` → không có kết quả khớp.
  - `docker inspect taskflow-api-1 --format '{{json .State.Health}}'` → trạng thái `healthy`, `FailingStreak=0` sau khi healthcheck chạy.
  - `curl http://127.0.0.1:3000/health/live`, `/health/ready` và `/version` → lần lượt trả `{"status":"ok"}`, `{"status":"ok"}` và `{"gitSha":"local-verified","buildTime":"2026-10-16T03:12:00Z"}`.
  - `docker build --target migrator --tag taskflow-migrator:local ./backend` → build thành công.
- CI run 38846004509 trên PR #7 đạt cả ba job `test`, `e2e`, `image`; PR #7 đã merge vào `main`. Cấu hình bảo vệ nhánh yêu cầu đúng ba bước kiểm tra này.
- CI run 38846749487 trên PR #8 đạt cả ba job `test`, `e2e`, `image`.
- Terraform có hai root riêng: khởi tạo state bucket và nền tảng AWS. `terraform fmt -check -recursive infra/bootstrap infra/terraform`, `terraform -chdir=infra/bootstrap validate`, `terraform -chdir=infra/terraform validate` và kiểm tra cú pháp cloud-init đều đạt local. Người dùng báo đã tạo bucket `taskflow-tfstate-<ACCOUNT_ID>` tại `ap-southeast-1` và cấu hình IAM operator; các thiết lập chưa được xác minh độc lập bằng output AWS. Chưa chạy plan/apply, chưa có bằng chứng triển khai.
- Chưa xác minh trên EC2; các bằng chứng trên chỉ phản ánh môi trường local.
