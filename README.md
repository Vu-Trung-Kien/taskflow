# TaskFlow

TaskFlow là ứng dụng web quản lý dự án và công việc, đồng thời là dự án thực hành quy trình DevOps trên AWS. Repository có backend NestJS và frontend React; triển khai backend container trên một EC2.

## Trạng thái hiện tại

Backend MVP đã được triển khai lên EC2:

- Đăng ký/đăng nhập với mật khẩu băm Argon2id.
- Access JWT có thời hạn 15 phút; refresh token được xoay vòng, chỉ lưu hash trong PostgreSQL; logout và phát hiện replay thu hồi phiên. Mỗi phiên đăng nhập có giới hạn tuyệt đối 30 ngày.
- Phân quyền dự án theo Owner, Member, Viewer.
- CRUD dự án và thành viên; archive/restore dự án; chuyển quyền Owner.
- CRUD task và sub-task một cấp; trạng thái `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`; mức ưu tiên `LOW`, `MEDIUM`, `HIGH`, `URGENT`; hạn hoàn thành, người thực hiện; soft-delete/restore task.
- Health endpoints `/health/live`, `/health/ready` và thông tin build `/version`.

Frontend MVP React + TypeScript + Vite bao phủ đăng nhập/đăng ký, quản lý dự án/thành viên, task/sub-task, bình luận, tệp đính kèm, dashboard và xuất CSV. Frontend chưa được triển khai production. API bình luận, attachment, metrics và CSV có trong mã nguồn; việc xác minh tích hợp object storage thực tế và phát hành các chức năng collaboration lên production chưa hoàn tất. Backend còn thiếu thông báo/email, task lặp và feature flags. Chưa thiết lập HTTPS/domain công khai, chưa diễn tập backup/restore, chưa cấu hình monitoring/cảnh báo hoặc kiểm thử tải; API chưa được công khai qua reverse proxy.

Các giới hạn xác thực và tệp đính kèm được chuẩn hóa như sau:

| Quy ước | Giá trị |
|---|---|
| Access JWT | 15 phút |
| Refresh token | Xoay vòng sau mỗi lần dùng thành công; chỉ lưu SHA-256 hash |
| Thời hạn tuyệt đối của phiên | 30 ngày; refresh không gia hạn |
| Kích thước tệp tối đa | 10 MiB |
| Thời hạn presigned URL | 5 phút |
| Trạng thái task | `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED` |
| Mức ưu tiên | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |

## Công nghệ

- **Backend:** NestJS, TypeScript, Prisma 7.
- **Database:** PostgreSQL 16.
- **Local object storage:** SeaweedFS với S3 API.
- **Email local:** MailHog.
- **Local development:** Docker Compose.
- **AWS:** EC2, ECR, EBS, S3, IAM/OIDC, Systems Manager; hạ tầng được quản lý bằng Terraform.
- **CI/CD:** GitHub Actions chạy lint, typecheck, unit/e2e tests, build image và Trivy; CD phát hành qua ECR và SSM.

## Chạy môi trường local

1. Sao chép `.env.example` thành `.env` ở thư mục gốc.
2. Đặt `JWT_ACCESS_SECRET` ngẫu nhiên, ít nhất 32 byte. Chỉ dùng mật khẩu mẫu trong `.env.example` cho môi trường local; không dùng làm credential production.
3. Khởi chạy các service:

```bash
docker compose up --build
```

API ở `http://localhost:3000`. PostgreSQL, MailHog và SeaweedFS chỉ bind vào loopback. Compose khởi chạy PostgreSQL. Để chạy lệnh Prisma từ máy host, sao chép `backend/.env.example` thành `backend/.env` và đặt `DATABASE_URL` khớp với thông tin PostgreSQL trong file `.env` gốc. Sau đó áp dụng migration:

```bash
cd backend
npm ci
npm run db:generate
npm run db:migrate:dev
```

Khi API đã chạy, mở terminal khác để chạy frontend. Vite proxy các route API về `localhost:3000`, vì vậy cookie refresh vẫn cùng origin trong môi trường dev:

```bash
cd frontend
npm ci
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal. Yêu cầu cấu hình CORS bucket S3-compatible và cách triển khai production được ghi trong [`frontend/README.md`](frontend/README.md).

## API chính

Các endpoint nghiệp vụ cần header `Authorization: Bearer <access-token>`, ngoại trừ đăng ký, đăng nhập, refresh, logout và health/version:

- `POST /auth/register`, `POST /auth/login`
- `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- `/projects` — CRUD dự án; `DELETE /projects/:projectId` archive, `POST /projects/:projectId/restore` khôi phục.
- `GET /projects/:projectId/metrics` — thống kê tiến độ, phân bố trạng thái, mức ưu tiên, task quá hạn và năng suất thành viên; mọi thành viên dự án được xem.
- `/projects/:projectId/members` — quản lý membership; chỉ Owner có thể quản lý thành viên và chuyển quyền.
- `/projects/:projectId/tasks` — task/sub-task; Owner và Member được ghi, Viewer chỉ đọc.
- `GET /projects/:projectId/tasks/export` — xuất danh sách công việc của dự án ra file CSV chuẩn UTF-8 kèm BOM; mọi thành viên dự án được xuất.
- `/projects/:projectId/tasks/:taskId/comments` — thành viên đọc; Owner/Member tạo bình luận; tác giả sửa/xóa bình luận của mình, Owner có thể quản lý mọi bình luận.
- `/projects/:projectId/tasks/:taskId/attachments` — Owner/Member upload/download qua presigned URL; giới hạn 10 MiB, MIME allowlist, URL 5 phút.
- `GET /health/live`, `GET /health/ready`, `GET /version`

Chi tiết chức năng, luồng và kiến trúc được ghi trong [tài liệu chức năng](docs/overview/product-overview.md),
[yêu cầu sản phẩm](docs/overview/requirements.md), [thiết kế kỹ thuật](docs/architecture/system-design.md)
và [thiết kế cơ sở dữ liệu](docs/architecture/database.md).

## Kiểm thử và build backend

```bash
cd backend
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

E2E tests cần PostgreSQL local đang chạy và `DATABASE_URL` trỏ tới database kiểm thử.

Frontend:

```bash
cd frontend
npm ci
npm test
npm run build
```

## AWS và phát hành

Terraform nằm trong [`infra/`](infra/); hướng dẫn state bootstrap ở [`infra/bootstrap/README.md`](infra/bootstrap/README.md) và nền tảng AWS ở [`infra/terraform/README.md`](infra/terraform/README.md). Quy trình production cùng yêu cầu Parameter Store được mô tả trong [`deploy/README.md`](deploy/README.md).

Không lưu secret vào Git, Terraform variables/state, GitHub variables hoặc log. Production runtime lấy PostgreSQL credential và JWT signing secret từ SSM Parameter Store `SecureString`; GitHub Actions dùng OIDC để build, scan, đẩy image lên ECR rồi yêu cầu EC2 triển khai qua SSM.

## Tài liệu

- [Mục lục tài liệu](docs/README.md)
- [Trạng thái hệ thống](docs/STATE.md)
- [Báo cáo tiến độ và Lịch sử phát triển](docs/project/progress.md)
- [Chức năng chính và luồng nghiệp vụ](docs/overview/product-overview.md)
- [Yêu cầu sản phẩm](docs/overview/requirements.md)
- [Thiết kế kỹ thuật](docs/architecture/system-design.md)
- [Thiết kế cơ sở dữ liệu](docs/architecture/database.md)
- [Triển khai production](deploy/README.md)
- [Khởi tạo Terraform state](infra/bootstrap/README.md)
- [Nền tảng AWS bằng Terraform](infra/terraform/README.md)
