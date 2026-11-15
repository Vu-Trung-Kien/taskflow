# Quy trình Triển khai Hệ thống (Deployment & Release Operations)

Tài liệu này đặc tả chi tiết quy trình triển khai ứng dụng **TaskFlow** lên môi trường production: luồng tự động hóa CI/CD, cơ chế xác thực OIDC không dùng credential tĩnh, quy trình release qua AWS Systems Manager (SSM) Run Command, kịch bản triển khai trên máy chủ EC2, cơ chế khôi phục phiên bản (Rollback) và kế hoạch phát hành Frontend Production.

---

## 1. Tổng quan Kiến trúc Triển khai

Quy trình phát hành của TaskFlow được tự động hóa hoàn toàn và đảm bảo an toàn tuyệt đối nhờ kiến trúc **GitOps / Push-via-SSM**:
- **Không lưu AWS Credentials tĩnh**: GitHub Actions sử dụng **OpenID Connect (OIDC)** để nhận quyền tạm thời từ AWS IAM.
- **Không mở cổng SSH trên máy chủ**: Lệnh triển khai được truyền tải mã hóa thông qua **AWS Systems Manager (SSM) Run Command**.
- **Images bất biến (Immutable Images)**: Mỗi bản phát hành được gắn tag bằng mã băm commit SHA đầy đủ 40 ký tự (`gitSha`). ECR bật chế độ tag bất biến (`IMMUTABLE`), ngăn chặn việc ghi đè image.
- **Tách biệt vai trò Container**: Image chính `api` chỉ phục vụ các request HTTP; image `migrator` riêng biệt chịu trách nhiệm thực thi migration database trước khi API mới khởi động.
- **Tự động Rollback**: Nếu phiên bản API mới không vượt qua bài kiểm tra sức khỏe (`/health/ready` hoặc `/version`), kịch bản tự động phục hồi container của bản phát hành trước đó.

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Lập trình viên
    participant GH as GitHub (CI/CD)
    participant ECR as AWS ECR
    participant SSM as AWS SSM
    participant EC2 as Máy chủ EC2
    participant S3 as AWS SSM Param Store

    Dev->>GH: Push code vào nhánh main
    Note over GH: Chạy CI (test, e2e, scan) thành công
    GH->>GH: Kích hoạt CD Workflow (.github/workflows/cd.yml)
    GH->>GH: Build Docker multi-stage (api & migrator)
    GH->>GH: Quét bảo mật Aqua Trivy (HIGH/CRITICAL)
    GH->>ECR: Đăng nhập via OIDC & Đẩy images (tag: <gitSha>)
    GH->>SSM: Gửi lệnh send-command (AWS-RunShellScript)
    
    SSM->>EC2: Kích hoạt deploy-release.sh qua SSM Agent
    EC2->>S3: Tải secrets (Postgres creds, JWT secret)
    EC2->>EC2: Tạo /etc/taskflow/runtime.env (chmod 0600)
    EC2->>ECR: Docker pull api, migrator & postgres
    EC2->>EC2: Khởi động container Postgres & chờ Healthy
    EC2->>EC2: Chạy container Migrator (prisma migrate deploy)
    EC2->>EC2: Cập nhật container API mới
    EC2->>EC2: Kiểm tra GET /health/ready & GET /version (so khớp SHA)
    EC2-->>SSM: Báo cáo kết quả thành công (Success)
    SSM-->>GH: CD Workflow hoàn tất
```

---

## 2. Các Thiết lập Tiền đề Trước lần Phát hành Đầu tiên

Trước khi kích hoạt pipeline CD lần đầu tiên, các tài nguyên sau bắt buộc phải được cấu hình chính xác:

### 2.1. Cấu hình GitHub Actions Variables
Trong giao diện GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions** -> tab **Variables** (lưu ý: cấu hình dưới dạng **Variables**, không phải Secrets):
1. `AWS_ROLE_ARN`: Giá trị ARN của IAM Role do Terraform tạo ra (`output.github_actions_role_arn`), ví dụ: `arn:aws:iam::123456789012:role/taskflow-github-release`.
2. `EC2_INSTANCE_ID`: ID của máy chủ EC2 production (`output.ec2_instance_id`), ví dụ: `i-0123456789abcdef0`.

### 2.2. Khởi tạo Secrets trên AWS SSM Parameter Store
Tại AWS Console (hoặc qua AWS CLI) ở region `ap-southeast-1`, khởi tạo 4 tham số bí mật với loại **`SecureString`** (sử dụng AWS KMS key mặc định `aws/ssm`):

```bash
# 1. PostgreSQL Username (1-63 ký tự ASCII, chữ cái, số hoặc _)
aws ssm put-parameter \
  --name "/taskflow/production/postgres-user" \
  --type "SecureString" \
  --value "taskflow_admin" \
  --region ap-southeast-1

# 2. PostgreSQL Password (Tối thiểu 32 ký tự ngẫu nhiên mạnh)
aws ssm put-parameter \
  --name "/taskflow/production/postgres-password" \
  --type "SecureString" \
  --value "$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9_-')" \
  --region ap-southeast-1

# 3. PostgreSQL Database Name (1-63 ký tự ASCII, chữ cái, số hoặc _)
aws ssm put-parameter \
  --name "/taskflow/production/postgres-db" \
  --type "SecureString" \
  --value "taskflow_production" \
  --region ap-southeast-1

# 4. JWT Access Token Signing Secret (Tối thiểu 43 ký tự base64url)
aws ssm put-parameter \
  --name "/taskflow/production/jwt-access-secret" \
  --type "SecureString" \
  --value "$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9_-')" \
  --region ap-southeast-1
```

> [!CAUTION]
> - Tham số `/taskflow/production/attachments-bucket` loại `String` được Terraform tạo tự động khi chạy `terraform apply`. Tuyệt đối không nhập đè thủ công.
> - Tuyệt đối không đổi `postgres-password` hoặc `postgres-user` trong Parameter Store sau khi database đã khởi tạo, vì giá trị trong database volume sẽ không tự thay đổi nếu chưa thực hiện quy trình xoay vòng (password rotation) thủ công.

---

## 3. Chi tiết Kịch bản Triển khai (`deploy/deploy-release.sh`)

Kịch bản triển khai [`deploy/deploy-release.sh`](../../deploy/deploy-release.sh) được thực thi trực tiếp trên máy chủ EC2 bởi AWS SSM Agent dưới quyền người dùng root. Các bước thực hiện tuần tự như sau:

### 3.1. Xác thực Đầu vào & Kiểm tra Môi trường
- Nhận 3 tham số bắt buộc: `<40-character-image-sha>`, `<ecr-repository-uri>`, `<aws-region>`.
- Kiểm tra tính hợp lệ bằng biểu thức chính quy (Regex):
  - Image SHA phải là chuỗi hexa 40 ký tự chữ thường (`^[0-9a-f]{40}$`).
  - ECR URI phải có định dạng `^[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com/taskflow-api$`.
  - AWS Region phải có định dạng chuẩn (`^[a-z]{2}(-gov)?-[a-z]+-[0-9]$`).
- Kiểm tra điểm gắn ổ đĩa EBS: Bắt buộc `/var/lib/taskflow/postgres` phải là một mountpoint hợp lệ (`mountpoint -q /var/lib/taskflow/postgres`).
- Khởi tạo thư mục con chứa dữ liệu PostgreSQL: `/var/lib/taskflow/postgres/data` với quyền sở hữu `999:999` (UID/GID của tiến trình Postgres trong container) và quyền `0700`.

### 3.2. Cài đặt Docker Compose Plugin Được Ghim Phiên bản (Pinned Version)
- Nếu hệ thống chưa có plugin `docker compose`, kịch bản tự động tải phiên bản **v2.39.4** chính thức từ GitHub Releases.
- Xác minh tính toàn vẹn của tệp nhị phân thông qua mã băm SHA-256 (`7af95166a730b87e172d4fc9aefea8725d3c6c7327d59149267b452114ddb7d4`) trước khi cấp quyền thực thi và chuyển vào `/usr/local/lib/docker/cli-plugins/docker-compose`.

### 3.3. Tải Secrets & Sinh File Cấu hình Runtime An toàn
- Kịch bản sử dụng lệnh `aws ssm get-parameter --with-decryption` để lấy trực tiếp các thông số nhạy cảm.
- Thực hiện kiểm tra định dạng dữ liệu trả về từ SSM để tránh lỗi inject cấu hình.
- Sinh tệp môi trường tạm thời, cấp quyền nghiêm ngặt **`chmod 0600`**, sau đó di chuyển nguyên tử (`mv -f`) tới đường dẫn cố định `/etc/taskflow/runtime.env`.
- Chuỗi kết nối cơ sở dữ liệu `DATABASE_URL` được tự động tổng hợp:
  `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public`.

### 3.4. Vòng đời Khởi chạy Container
1. **Docker Login ECR**: Đăng nhập ECR qua token tạm thời (`aws ecr get-login-password`).
2. **Kéo Images**: `docker compose pull postgres api migrator`.
3. **Khởi chạy PostgreSQL**:
   - `docker compose up --detach postgres`.
   - Vòng lặp thăm dò (polling) sức khỏe container PostgreSQL thông qua lệnh `pg_isready`: tối đa 60 lần x 5s = 300s.
   - Bắt buộc trạng thái container chuyển sang `healthy` mới tiếp tục.
4. **Thực thi Migration Cơ sở Dữ liệu**:
   - `docker compose run --rm migrator`.
   - Container migrator thực thi lệnh `prisma migrate deploy` và tự động hủy bỏ (`--rm`) sau khi hoàn tất.
5. **Cập nhật API Container**:
   - `docker compose up --detach --no-deps api`.
   - Thay thế container API đang chạy bằng container image mới mà không làm gián đoạn PostgreSQL.

### 3.5. Kiểm tra Xác thực Hậu Triển khai (Post-deployment Verification)
Kịch bản thực hiện thăm dò trong tối đa 5 phút (60 lần x 5s):
1. **Kiểm tra Liveness/Readiness**: Gửi yêu cầu HTTP `GET http://127.0.0.1:3000/health/ready`. Yêu cầu này xác nhận API đã khởi động xong và kết nối tới PostgreSQL đang thông suốt.
2. **Kiểm tra Khớp Phiên bản (Version Consistency)**: Gửi yêu cầu `GET http://127.0.0.1:3000/version`. Phản hồi JSON phải chứa trường `"gitSha"` khớp chính xác 100% với commit SHA được yêu cầu triển khai:
   ```bash
   grep -Eq '"gitSha"[[:space:]]*:[[:space:]]*"'"$IMAGE_TAG"'"'
   ```
3. Nếu cả hai điều kiện thỏa mãn, kịch bản trả về mã thoát 0 (thành công).

---

## 4. Cơ chế Khôi phục Phiên bản (Rollback Strategy)

Hệ thống cung cấp hai cấp độ khôi phục phiên bản khi xảy ra sự cố:

### 4.1. Rollback Tự động Ngay tại Thời điểm Triển khai (Local Auto-Rollback)
- Trong [`deploy/deploy-release.sh`](../../deploy/deploy-release.sh), cơ chế `trap restore_previous_release EXIT` được kích hoạt ngay khi kịch bản bắt đầu.
- Trước khi ghi đè runtime env mới, kịch bản sao lưu nội dung của `/etc/taskflow/runtime.env` cũ và lưu lại tag image trước đó.
- Nếu quá trình cập nhật API thất bại (container bị crash, timeout, hoặc `/version` không khớp SHA):
  1. Hàm trap bắt lỗi và tự động khôi phục lại tệp cấu hình runtime trước đó.
  2. Tự động thực thi `docker compose up --detach --no-deps api` để kích hoạt lại image API ổn định trước đó.
  3. Báo cáo lỗi chi tiết về SSM Run Command để kỹ sư vận hành xử lý.

### 4.2. Rollback Chủ động Qua GitHub Actions (Manual Workflow Dispatch)
Khi cần quay trở lại một phiên bản cũ trong lịch sử:
1. Truy cập tab **Actions** trên GitHub repository.
2. Chọn workflow **CD** ở danh sách bên trái.
3. Bấm **Run workflow**:
   - Chọn nhánh `main`.
   - Nhập **mã băm commit SHA đầy đủ 40 ký tự** của phiên bản ổn định cần phục hồi vào ô `image_tag`.
4. Workflow sẽ:
   - Kiểm tra xác nhận cả hai image `taskflow-api:<SHA>` và `taskflow-migrator:<SHA>` đã tồn tại sẵn trong ECR.
   - Bỏ qua bước build/scan mới, trực tiếp đóng gói và gửi lệnh SSM tới EC2 để hạ cấp API về đúng SHA mong muốn.

```mermaid
flowchart TD
    Start["Sự cố xảy ra sau Release"] --> Choose["Chọn phương án Rollback"]
    
    Choose -->|Trong quá trình Deploy lỗi| Auto["Trap tự động trong script deploy-release.sh"]
    Auto --> RestoreEnv["Khôi phục /etc/taskflow/runtime.env cũ"]
    RestoreEnv --> StartOldApi["Khởi động lại image API trước đó"]
    StartOldApi --> EndAuto["Hoàn tất Rollback tức thì"]

    Choose -->|Sự cố logic phát hiện sau đó| Manual["Kích hoạt manual CD Workflow"]
    Manual --> InputSHA["Nhập Commit SHA 40 ký tự trước đó"]
    InputSHA --> VerifyECR["Xác minh image tag đã tồn tại trên ECR"]
    VerifyECR --> SSMDispatch["Gửi SSM Run Command triển khai SHA cũ"]
    SSMDispatch --> EndManual["Hệ thống quay về bản phát hành chỉ định"]
```

> [!WARNING]
> **Giới hạn của Cơ chế Rollback đối với Cơ sở Dữ liệu**:
> Kịch bản rollback chỉ thay thế phiên bản ứng dụng (container `api`), **hoàn toàn không tự động rollback cấu trúc cơ sở dữ liệu (schema migrations)**. Do đó, toàn bộ migrations phải luôn tuân thủ nguyên tắc **tương thích ngược (Expand/Contract pattern)** theo quy chuẩn tại [Quy ước Phát triển](../development/conventions.md#3-checklist-pr-chứa-database-migration-expandcontract). Không thực hiện xóa cột hoặc bảng ngay trong một bước mà chưa qua chu kỳ deprecated.

### 4.3. Chính sách Vòng đời ECR (ECR Lifecycle Policy)
- Repository ECR `taskflow-api` được cấu hình giữ tối đa **10 images gần nhất** (`countNumber: 10`).
- Do mỗi đợt phát hành sinh ra 2 image tags (`<SHA>` và `<SHA>-migrator`), số lượng bản phát hành có thể rollback ngay lập tức từ ECR là **5 bản phát hành gần nhất**.

---

## 5. Kế hoạch Triển khai Frontend Production (ADR-001) `[CHƯA LÀM]`

Theo quyết định kiến trúc [ADR-001](../architecture/decisions.md#adr-001-phương-án-triển-khai-frontend-production-caddy-trên-ec2), trong tương lai khi đưa giao diện người dùng ra môi trường công khai, mô hình triển khai sẽ được nâng cấp như sau:

1. **Đóng gói Static Web**:
   - Trong quá trình CI/CD, chạy lệnh `npm run build` trên thư mục `frontend/` để tạo các static assets tối ưu (`dist/`).
2. **Web Server & Reverse Proxy Caddy**:
   - Bổ sung service `web` vào file [`deploy/compose.production.yaml`](../../deploy/compose.production.yaml) sử dụng Docker image `caddy:2.8-alpine`.
   - Caddy mount thư mục tĩnh của React và file cấu hình `Caddyfile`.
   - Caddy trực tiếp lắng nghe cổng 80 và 443 của máy chủ EC2.
3. **Định tuyến Yêu cầu (Routing & Reverse Proxy)**:
   - Các yêu cầu tới `/api/*` và `/health/*`: Caddy làm reverse proxy chuyển tiếp tới `http://api:3000`.
   - Các yêu cầu khác: Caddy phục vụ file tĩnh và fallback về `index.html` cho các route React Router SPA (`try_files {path} /index.html`).
   - Tự động kích hoạt chứng chỉ SSL/TLS miễn phí qua giao thức ACME (Let's Encrypt / ZeroSSL) khi có tên miền chính thức.

---

## 6. Sổ tay Vận hành & Xử lý Sự cố (Troubleshooting Guide)

### 6.1. Kiểm tra Trạng thái Lệnh Triển khai SSM
Khi workflow GitHub Actions báo lỗi tại bước `Deploy through Systems Manager`:
1. Mở AWS Console -> Dịch vụ **Systems Manager** -> **Run Command**.
2. Tìm `Command ID` được in ra trong log của GitHub Actions.
3. Chọn instance đích và xem thẻ **Output** để đọc chi tiết nhật ký thực thi của shell script.
4. Hoặc tra cứu nhanh bằng AWS CLI:
   ```bash
   aws ssm get-command-invocation \
     --command-id "<command-id>" \
     --instance-id "<instance-id>" \
     --region ap-southeast-1
   ```

### 6.2. Kiểm tra Trực tiếp trên Máy chủ EC2 qua SSM Session Manager
Nếu cần truy cập máy chủ để kiểm tra:
1. Kết nối vào máy chủ mà không cần SSH:
   ```bash
   aws ssm start-session --target "<instance-id>" --region ap-southeast-1
   ```
2. Chuyển sang quyền root: `sudo su -`.
3. Kiểm tra trạng thái các container:
   ```bash
   docker compose --project-name taskflow --file /opt/taskflow/releases/<SHA>/compose.production.yaml ps -a
   ```
4. Xem log theo thời gian thực của backend API:
   ```bash
   docker compose --project-name taskflow --file /opt/taskflow/releases/<SHA>/compose.production.yaml logs -f api
   ```
5. Kiểm tra log của lần chạy database migration gần nhất:
   ```bash
   docker compose --project-name taskflow --file /opt/taskflow/releases/<SHA>/compose.production.yaml logs migrator
   ```
6. Kiểm tra dung lượng ổ đĩa EBS chứa dữ liệu PostgreSQL:
   ```bash
   df -h /var/lib/taskflow/postgres
   ```

---

## 7. Tài liệu Liên quan

- [Hướng dẫn Triển khai Gốc](../../deploy/README.md)
- [Kiến trúc An toàn Thông tin](../architecture/security.md)
- [Tổng quan Hạ tầng AWS](aws-infrastructure.md)
- [Quyết định Kiến trúc ADR-001 & ADR-002](../architecture/decisions.md)
- [Đặc tả Các Luồng Hoạt động Trọng yếu](../architecture/flows.md#5-luồng-phát-hành-production-cicd-và-ssm-deploy)
- [Quy chuẩn Kiểm thử & Code Quality](../development/testing-guide.md)
- [Vấn đề Tồn đọng & Điểm lệch Kỹ thuật](../project/known-issues.md)
