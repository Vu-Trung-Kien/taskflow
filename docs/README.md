# Tài liệu Kỹ thuật TaskFlow

Chào mừng bạn đến với bộ tài liệu kỹ thuật của dự án **TaskFlow**. Tài liệu được tổ chức theo từng chủ đề chuyên môn nhằm phục vụ việc tìm hiểu, phát triển, kiểm thử và vận hành hệ thống.

---

## 1. Trạng thái Hệ thống

- [**STATE.md**](STATE.md): Báo cáo hiện trạng hệ thống, snapshot tiến độ qua các mốc phát triển, ma trận môi trường xác minh (Local vs EC2 Production) và kết quả đối chiếu giữa mã nguồn và thực tế.

---

## 2. Danh mục Tài liệu theo Chủ đề

```text
docs/
├── README.md                      # [Mục lục trung tâm]
├── STATE.md                       # [Hiện trạng hệ thống & snapshot tiến độ]
├── overview/                      # [Tổng quan sản phẩm & Yêu cầu]
├── architecture/                  # [Thiết kế kiến trúc, DB & An toàn thông tin]
├── modules/                       # [Đặc tả kỹ thuật từng module nghiệp vụ]
├── api/                           # [Đặc tả REST API endpoints & DTOs]
├── development/                   # [Hướng dẫn chạy local & Quy chuẩn kiểm thử]
├── operations/                    # [Quy trình release, CI/CD & Hạ tầng AWS]
└── project/                       # [Lộ trình phát triển & Vấn đề tồn đọng]
```

### 2.1. Tổng quan & Yêu cầu (`overview/`)
- [**Tổng quan Sản phẩm**](overview/product-overview.md): Mục tiêu, tầm nhìn sản phẩm, đối tượng người dùng (personas) và các tính năng cốt lõi.
- [**Yêu cầu Hệ thống**](overview/requirements.md): Yêu cầu chức năng (FR), yêu cầu phi chức năng (NFR), các quy ước chuẩn hóa (JWT 15m, file ≤ 10MB...) và phạm vi MVP.

### 2.2. Kiến trúc Hệ thống (`architecture/`)
- [**Thiết kế Kiến trúc Tổng thể**](architecture/system-design.md): Sơ đồ tầng hệ thống, tương tác giữa Client - API - Database - Object Storage, luồng dữ liệu và quyết định kỹ thuật cốt lõi.
- [**Thiết kế Cơ sở Dữ liệu**](architecture/database.md): Mô hình ERD, định nghĩa bảng, quan hệ khóa ngoại, index hiệu năng và cascade rules (PostgreSQL 16 & Prisma 7).
- *Kiến trúc An toàn Thông tin* (`architecture/security.md`): *(Đang hoàn thiện)* Băm Argon2id, SHA-256 hash refresh token, chống replay attack, presigned URL policy và quản lý secret qua AWS SSM.

### 2.3. Chi tiết Module Nghiệp vụ (`modules/`)
- *Module Xác thực & Phiên* (`modules/auth.md`): *(Đang hoàn thiện)* Đăng ký, đăng nhập, xoay vòng Refresh token, thu hồi phiên và thời hạn tuyệt đối 30 ngày.
- *Module Dự án & Phân quyền* (`modules/projects.md`): *(Đang hoàn thiện)* Vòng đời dự án, phân quyền RBAC (`OWNER`, `MEMBER`, `VIEWER`), chuyển quyền sở hữu.
- *Module Công việc & Kanban* (`modules/tasks.md`): *(Đang hoàn thiện)* Quản lý task, sub-task 1 cấp, soft-delete, cơ chế kéo-thả Kanban và xuất CSV UTF-8 kèm BOM.
- *Module Cộng tác & Đính kèm Tệp* (`modules/collaboration.md`): *(Đang hoàn thiện)* Bình luận công việc và luồng upload/download tệp đính kèm qua S3 Presigned URL + xác nhận HeadObject.
- *Module Thông báo In-app* (`modules/notifications.md`): *(Đang hoàn thiện)* Kích hoạt thông báo theo sự kiện, API đọc/đánh dấu đã đọc và giao diện chuông trên frontend.

### 2.4. Giao diện Lập trình Ứng dụng (`api/`)
- *Đặc tả REST API* (`api/reference.md`): *(Đang hoàn thiện)* Danh mục toàn bộ API endpoints, DTOs, headers, mẫu request/response và mã lỗi HTTP.

### 2.5. Phát triển & Kiểm thử (`development/`)
- *Hướng dẫn Môi trường Local* (`development/local-setup.md`): *(Đang hoàn thiện)* Khởi chạy Docker Compose (PostgreSQL, SeaweedFS, MailHog), Prisma migrations và Vite dev proxy.
- *Quy chuẩn Kiểm thử & Code Quality* (`development/testing-guide.md`): *(Đang hoàn thiện)* Kiểm thử Jest unit/e2e backend, Vitest frontend, Oxlint và TypeScript typecheck.

### 2.6. Vận hành & Hạ tầng (`operations/`)
- *Quy trình Triển khai Production* (`operations/deployment.md`): *(Đang hoàn thiện)* Pipeline CI/CD GitHub Actions, phát hành qua AWS SSM Run Command, kế hoạch triển khai Frontend static build + reverse proxy Caddy `[CHƯA LÀM]`.
- *Tổng quan Hạ tầng AWS* (`operations/aws-infrastructure.md`): *(Đang hoàn thiện)* Tổng hợp tài nguyên Terraform (VPC, EC2, EBS mã hóa, S3, ECR, IAM OIDC).
- [Hướng dẫn Triển khai Chi tiết](../deploy/README.md): Quy trình SSM Run Command và các tham số Parameter Store production.
- [Thiết lập Hạ tầng AWS bằng Terraform](../infra/terraform/README.md): Cấu hình mã nguồn Terraform cho production.
- [Khởi tạo Terraform State Bootstrap](../infra/bootstrap/README.md): Khởi tạo S3 bucket và DynamoDB lock table cho Terraform state.

### 2.7. Quản lý Dự án (`project/`)
- [**Báo cáo Tiến độ & Lịch sử Phát triển**](project/progress.md): Chi tiết các mốc phát triển theo tuần, ma trận trạng thái hệ thống và lộ trình hoàn thiện.
- *Lộ trình Hoàn thiện* (`project/roadmap.md`): *(Đang hoàn thiện)* Kế hoạch các tính năng tiếp theo: Dịch vụ Email SES/MailHog `[CHƯA LÀM]`, Recurring Tasks `[CHƯA LÀM]`, Frontend Caddy `[CHƯA LÀM]`, Tự động backup DB.
- *Vấn đề Tồn đọng & Nợ Kỹ thuật* (`project/known-issues.md`): *(Đang hoàn thiện)* Bảng đối chiếu các điểm lệch giữa mã nguồn, migration và tài liệu; các hạng mục tối ưu hóa mã nguồn.

---

## 3. Lộ trình Đọc Tài liệu theo Vai trò

- **Dành cho Developer mới gia nhập**:
  1. Bắt đầu với [README gốc](../README.md) để hiểu nhanh cách khởi chạy dự án.
  2. Đọc [Tổng quan Sản phẩm](overview/product-overview.md) và [Yêu cầu Hệ thống](overview/requirements.md).
  3. Tìm hiểu [Thiết kế Kiến trúc](architecture/system-design.md) và [Cơ sở Dữ liệu](architecture/database.md).
- **Dành cho Kỹ sư DevOps / Vận hành**:
  1. Đọc [STATE.md](STATE.md) để nắm hiện trạng triển khai.
  2. Đọc [Hướng dẫn Triển khai](../deploy/README.md) và [Terraform Infrastructure](../infra/terraform/README.md).
  3. Xem xét các yêu cầu bảo mật trong [Thiết kế Kiến trúc](architecture/system-design.md#8-các-ràng-buộc-bảo-mật).
- **Dành cho Product Owner / QA**:
  1. Xem [Yêu cầu Hệ thống](overview/requirements.md) để nắm phạm vi chức năng và tiêu chí nghiệm thu.
  2. Theo dõi tiến độ tại [STATE.md](STATE.md).
