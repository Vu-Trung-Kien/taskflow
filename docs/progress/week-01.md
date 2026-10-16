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
- Đã bổ sung workflow CD OIDC → ECR → SSM, Compose production riêng và script chạy migration/kiểm tra health-version/rollback image. Trong quá trình phát hành, Trivy ban đầu phát hiện 19 HIGH ở migrator image; đã tối giản image, thêm scan migrator vào CI, build/migration/Trivy local đạt và PR #12 merge. Trust IAM ban đầu không khớp immutable OIDC subject của GitHub; PR #13 sửa Terraform trust đúng repository/nhánh `main` và apply một cập nhật role. Lần triển khai sau phát hiện hai lỗi vận hành: cấu trúc gói SSM sai đường dẫn (PR #14) và PostgreSQL không khởi tạo khi bind thẳng vào EBS mount root có `lost+found` (PR #15). Sau khi sửa, CI main run 38876373522 và CD run 38876642192 đều đạt.
- AWS CLI xác minh ba Parameter Store parameter production tồn tại với loại `SecureString`, EC2 `running`, SSM `Online`; không đọc giá trị secret. Triển khai cuối đã chạy Prisma migration, PostgreSQL và API healthy; `/health/live`, `/health/ready`, `/version`, EBS bind mount và việc không publish cổng PostgreSQL được kiểm tra độc lập qua SSM.
- Đã viết Terraform bootstrap cho state và nền tảng AWS; PR #8 đã merge vào `main`; kiểm tra định dạng/xác thực local cùng CI `test`, `e2e`, `image` đều đạt. Đã apply Terraform foundation và xác minh các tài nguyên AWS.

## Chưa triển khai

- Frontend và các API nghiệp vụ của TaskFlow.
- Backup/restore PostgreSQL, monitoring và cảnh báo.
- Reverse proxy, domain/DNS và HTTPS công khai; API hiện chỉ bind vào loopback trên EC2.

## Ghi chú

- Prisma schema và migration hiện là nền tảng thử nghiệm, chưa phải thiết kế dữ liệu cuối cùng.
- `frontend/` vẫn là thư mục giữ chỗ; `deploy/` có Compose production, script CD và runbook.

## Ma trận trạng thái

| Hạng mục | Trạng thái hiện tại | Môi trường triển khai |
|---|---|---|
| Backend, endpoint health/version, PostgreSQL và Docker image | Đã kiểm thử local | Đã xác minh trên EC2 qua SSM: API/PostgreSQL healthy, migration xong, `/health/live`, `/health/ready`, `/version` đạt |
| CI: `test`, `e2e`, `image` | Đạt trên main; [lần chạy workflow 38876373522](https://github.com/Vu-Trung-Kien/taskflow/actions/runs/38876373522) | Không áp dụng |
| Bảo vệ nhánh `main` | Đã bật; bắt buộc dùng PR và yêu cầu các bước kiểm tra `test`, `e2e`, `image` | Không áp dụng |
| Nền tảng AWS bằng Terraform | Đã apply: tạo 26 tài nguyên; EC2, SSM, EBS, Security Group, ECR và S3 đã được kiểm tra | Hạ tầng đã xác minh |
| Mã workflow/CD Compose/script | PR #11–#15 đã merge; CI main run 38876373522 đạt `test`, `e2e`, `image`; [CD run 38876642192](https://github.com/Vu-Trung-Kien/taskflow/actions/runs/38876642192) thành công | Đã phát hành |
| AWS runtime configuration | Ba Parameter Store parameter được xác minh metadata `SecureString`; EC2 `running`, SSM `Online`; không truy xuất secret value | Sẵn sàng theo các kiểm tra nêu trên |
| IAM OIDC trust cho release role | Immutable subject đã apply và xác minh; plan có 0 tạo, 1 cập nhật, 0 xóa | Đã áp dụng |
| CD lên EC2, migration production, health/version | Đã chạy migration `20261016021415_init`; `/health/ready` báo database `up`; `/version` trả SHA release | Đã xác minh trên EC2 |

- Backend đã qua kiểm tra kiểu (`npm run typecheck`), lint, unit test (6), tạo Prisma Client, `prisma migrate deploy` (không còn migration chờ), e2e (4), build, kiểm tra Compose và chạy trong Compose.
- Trạng thái backend: **Đã kiểm thử local và xác minh trên môi trường triển khai**. Bằng chứng local (16/10/2026):
  - `docker compose exec -T api id` → `uid=1000(node) gid=1000(node) groups=1000(node)`.
  - `docker compose exec -T api ls -la dist/generated/prisma` → có `client.js`, `internal/` và `models/`; client Prisma 7 được biên dịch cùng source.
  - `docker images taskflow-api` → `taskflow-api:latest`, ID `a7487724150c`, content size `186MB`.
  - `docker history --no-trunc taskflow-api | grep -iE 'postgresql://|secret|password'` → không có kết quả khớp.
  - `docker inspect taskflow-api-1 --format '{{json .State.Health}}'` → trạng thái `healthy`, `FailingStreak=0` sau khi healthcheck chạy.
  - `curl http://127.0.0.1:3000/health/live`, `/health/ready` và `/version` → lần lượt trả `{"status":"ok"}`, `{"status":"ok"}` và `{"gitSha":"local-verified","buildTime":"2026-10-16T03:12:00Z"}`.
  - `docker build --target migrator --tag taskflow-migrator:local ./backend` → build thành công.
- Bằng chứng triển khai EC2 (16/10/2026), thu thập qua SSM sau CD run 38876642192:
  - SSM Run Command trả `Success`; `/health/live` trả `{"status":"ok"}`.
  - `/health/ready` trả trạng thái `ok`, database `up`.
  - `/version` trả `gitSha=6d50d7e570b770993d93b6732fd47a66de9a8da6`; commit này khớp release được triển khai.
  - PostgreSQL container health `healthy`; migration `20261016021415_init` có `finished_at` khác null.
  - EBS mount tại `/var/lib/taskflow/postgres`; bind mount datadir là `/var/lib/taskflow/postgres/data` → `/var/lib/postgresql/data`, owner `999:999`, mode `700`.
  - PostgreSQL không publish cổng host; API chỉ bind `127.0.0.1:3000`. Không có kiểm tra HTTPS/domain vì reverse proxy chưa được cài.
- CI run 38846004509 trên PR #7 đạt cả ba job `test`, `e2e`, `image`; PR #7 đã merge vào `main`. Cấu hình bảo vệ nhánh yêu cầu đúng ba bước kiểm tra này.
- CI run 38846749487 trên PR #8 đạt cả ba job `test`, `e2e`, `image`.
- Terraform có hai root riêng: khởi tạo state bucket và nền tảng AWS. `terraform fmt -check -recursive infra/bootstrap infra/terraform`, `terraform -chdir=infra/bootstrap validate`, `terraform -chdir=infra/terraform validate` và kiểm tra cú pháp cloud-init đều đạt local.
- Ngày 16/10/2026, AWS CLI xác nhận profile operator đang dùng assumed role có MFA; state bucket ở `ap-southeast-1`, bật đủ bốn cờ public-access-block, versioning và mã hóa AES256. Không có bucket policy trên state bucket; người dùng chấp thuận ngoại lệ không có explicit TLS-deny policy cho lần plan này. Không thay đổi policy bucket.
- `terraform -chdir=infra/terraform init -backend-config=backend.hcl` thành công với backend S3 hiện có; state object và lock object đều không tồn tại trước plan. AWS credential phiên tạm được chuyển trực tiếp trong bộ nhớ cho Terraform, không ghi vào file.
- `terraform -chdir=infra/terraform fmt -check -recursive` và `terraform -chdir=infra/terraform validate` đạt. Plan được review trước khi apply: 26 tài nguyên tạo mới, 3 data source được đọc, không update/delete/replacement.
- Apply dùng đúng saved plan đã review, hoàn tất với 26 tài nguyên thêm mới, 0 thay đổi, 0 xóa. Tài nguyên gồm EC2 `t3.small` có public IPv4, root EBS gp3 16 GiB, EBS PostgreSQL gp3 mã hóa 20 GiB, Security Group chỉ mở công khai cổng 80/443, cùng ECR, IAM/OIDC và hai S3 bucket ứng dụng.
- Kiểm tra AWS sau apply: EC2 `running`, IMDSv2 `required`; SSM managed instance `Online`; cloud-init `done`; Docker `active`; EBS PostgreSQL ở trạng thái `in-use`, mount ext4 tại `/var/lib/taskflow/postgres`, filesystem 20 GiB và owner `999:999`. Security Group có ingress TCP 80/443 từ `0.0.0.0/0`, không có SSH/22 hoặc PostgreSQL/5432.
- ECR xác nhận immutable tags, scan-on-push và mã hóa AES256. Hai S3 bucket ứng dụng xác nhận đủ bốn cờ public-access-block, versioning `Enabled`, AES256, policy không public và có TLS-deny. Không ghi bucket name, ARN, instance ID hoặc public IP vào báo cáo.
- Tại lần xác minh sau CD run 38876642192, PostgreSQL và API containers đều healthy; migration production cùng `/health/live`, `/health/ready`, `/version` đã được kiểm chứng. Các luồng nghiệp vụ TaskFlow chưa được triển khai nên chưa có kết quả kiểm thử trên EC2.
- Ước tính chi phí nền cho 730 giờ/tháng theo [AWS Price List API](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/price-changes.html): EC2 `t3.small` khoảng 19,27 USD; 36 GiB gp3 EBS (16 GiB root + 20 GiB PostgreSQL) khoảng 3,46 USD; public IPv4 khoảng 3,65 USD (theo [biểu phí IPv4 công khai của AWS](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/)); tổng khoảng **26,38 USD/tháng**. Chưa gồm S3/ECR lưu trữ và request, data transfer, snapshot/backup, CPU credit vượt baseline, thuế hoặc mức giảm trừ Free Tier; đây là ước tính tham khảo, không phải hóa đơn/quote.
- Trạng thái hạ tầng AWS: **đã apply và đã kiểm tra các tài nguyên nêu trên**. Backend nền tảng hiện **Verified in Deployment** theo các bằng chứng SSM ở trên; frontend, luồng nghiệp vụ, HTTPS, backup/restore và monitoring vẫn chưa triển khai.
