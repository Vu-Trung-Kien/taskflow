# TaskFlow

TaskFlow là ứng dụng web quản lý dự án và công việc theo nhóm, đồng thời là dự án thực hành xây dựng, phát hành và vận hành phần mềm trên AWS.

**[Mở ứng dụng](https://taskflowvutrungkien.duckdns.org)** · [Hướng dẫn phát triển](docs/development/local-setup.md) · [Tham chiếu API](docs/api/reference.md) · [Hướng dẫn triển khai](docs/operations/deployment.md)

## Chức năng

- **Tài khoản** — đăng ký, đăng nhập, cập nhật hồ sơ và đổi mật khẩu. Access token có thời hạn 15 phút. Refresh token được xoay vòng và phiên có giới hạn 30 ngày.
- **Dự án và phân quyền** — quản lý thành viên theo vai trò Owner, Member và Viewer. Chủ dự án có thể chuyển quyền sở hữu, lưu trữ và khôi phục dự án.
- **Công việc** — quản lý công việc và công việc con một cấp, phân công, đặt hạn chót, lọc theo trạng thái hoặc mức ưu tiên, xóa mềm và khôi phục.
- **Cộng tác** — bình luận, đính kèm tệp tối đa 10 MiB qua URL ký trước và nhận thông báo trong ứng dụng cho các sự kiện liên quan, gồm cả nhắc việc sắp đến hạn.
- **Báo cáo** — theo dõi tiến độ và khối lượng công việc theo thành viên, xuất danh sách công việc dưới dạng CSV.

## Kiến trúc

| Thành phần | Công nghệ |
| --- | --- |
| Giao diện | React, TypeScript, Vite |
| API | NestJS, TypeScript, Prisma 7 |
| Dữ liệu | PostgreSQL 16 trên EBS |
| Tệp đính kèm | Amazon S3 trên AWS, SeaweedFS tương thích S3 ở môi trường local |
| Hạ tầng và phát hành | Terraform, AWS EC2, ECR, Systems Manager, GitHub Actions |

Trên AWS, Caddy phục vụ bản build React qua HTTPS và chuyển tiếp tuyến `/api/*` đến NestJS. Frontend và backend chạy trong hai Docker Compose project trên cùng EC2, kết nối qua mạng Docker dùng chung. PostgreSQL lưu dữ liệu trên EBS và không mở cổng công khai. [Thiết kế hệ thống](docs/architecture/system-design.md) · [Mô hình dữ liệu](docs/architecture/database.md)

## Phát triển local

Cần **Node.js 24**, npm và Docker Compose v2. Hướng dẫn dưới đây chạy PostgreSQL và SeaweedFS bằng Docker, còn NestJS và Vite chạy trực tiếp trên máy để tự tải lại khi sửa mã.

**1. Chuẩn bị cấu hình và dịch vụ phụ thuộc.** Từ thư mục gốc của repo:

```bash
test -f .env || cp .env.example .env
test -f backend/.env || cp backend/.env.example backend/.env
```

Trong `backend/.env`, đặt `JWT_ACCESS_SECRET` bằng giá trị ngẫu nhiên tạo từ `openssl rand -hex 32`. Đặt `DATABASE_URL` và các thông tin S3 khớp với `.env` ở thư mục gốc. Vì NestJS chạy trên máy local, đặt `S3_ENDPOINT=http://localhost:8333` trong `backend/.env`.

```bash
docker compose up -d --wait postgres seaweedfs
```

**2. Khởi động backend.**

```bash
cd backend
npm ci
npm run db:generate -- --config prisma7.config.ts
npm run db:migrate:deploy -- --config prisma7.config.ts
npm run start:dev
```

**3. Khởi động frontend.** Mở terminal khác ở thư mục gốc của repo:

```bash
cd frontend
npm ci
npm run dev
```

Mở [giao diện local](http://localhost:5173). Vite chuyển tiếp các tuyến API tới NestJS ở cổng 3000. Tài liệu local có thêm cấu hình CORS cho tệp đính kèm. [Thiết lập local](docs/development/local-setup.md) · [Cấu hình frontend](frontend/README.md)

## Kiểm thử

Sau khi cài dependency và tạo Prisma Client như trên, chạy các lệnh trong thư mục tương ứng.

| Thư mục | Lệnh |
| --- | --- |
| `backend/` | `npm run lint`, `npm run typecheck`, `npm test -- --runInBand`, `npm run build` |
| `backend/` | `npm run test:e2e -- --runInBand` |
| `frontend/` | `npm test`, `npm run build` |

Kiểm thử end-to-end của backend cần một database PostgreSQL **riêng cho kiểm thử**, đã áp dụng migration, với `DATABASE_URL` trỏ tới database đó. [Hướng dẫn kiểm thử](docs/development/testing-guide.md)

## Phát hành trên AWS

| Workflow | Cách chạy |
| --- | --- |
| [CI](.github/workflows/ci.yml) | Kiểm tra PR vào `main` và các lần push theo cấu hình workflow. |
| [CD backend](.github/workflows/cd.yml) | Tự chạy sau khi CI thành công cho commit được push lên `main`. Phát hành API và migrator qua ECR, chạy migration trên EC2 rồi kiểm tra readiness. Chế độ thủ công cần SHA của bản đã có đủ hai image trong ECR. |
| [Release frontend](.github/workflows/frontend-release.yml) | Chạy thủ công trên `main` sau khi API sẵn sàng. Workflow build React, quét image Caddy rồi triển khai qua ECR và Systems Manager. |

GitHub Actions xác thực với AWS qua OIDC. Backend đọc thông tin kết nối PostgreSQL và khóa ký JWT từ SSM Parameter Store. Các thay đổi hạ tầng được áp dụng riêng bằng Terraform. [Hạ tầng AWS](infra/terraform/README.md) · [Cấu hình production](deploy/README.md)

Kiểm tra công khai sau khi phát hành:

- [Liveness](https://taskflowvutrungkien.duckdns.org/api/health/live) kiểm tra tiến trình API.
- [Readiness](https://taskflowvutrungkien.duckdns.org/api/health/ready) kiểm tra API và kết nối PostgreSQL.
- [Phiên bản](https://taskflowvutrungkien.duckdns.org/api/version) cho biết Git SHA và thời điểm build backend.

## Tài liệu dự án

- [Mục lục tài liệu](docs/README.md)
- [Phạm vi và yêu cầu sản phẩm](docs/overview/requirements.md)
- [Tham chiếu API](docs/api/reference.md)
- [Kiến trúc bảo mật](docs/architecture/security.md)
- [Lộ trình](docs/project/roadmap.md)
