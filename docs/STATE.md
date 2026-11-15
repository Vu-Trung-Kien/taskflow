# Trạng thái Dự án & Tài liệu (STATE)

## Đang làm
- Chờ Tech Lead duyệt kết quả Bước 3 trước khi tiến hành Bước 4 (hoàn thiện `operations/`: deployment, aws-infrastructure và `architecture/security.md`).

## Đã xong
- **Đã xong Bước 1 (Nền tảng: Overview, Architecture, Data Model)**:
  - Cập nhật [`docs/overview/product-overview.md`](overview/product-overview.md): Rà khớp mã nguồn, đưa Notification và Kanban vào chính thức, gắn nhãn hạ tầng.
  - Cập nhật [`docs/architecture/system-design.md`](architecture/system-design.md): Sơ đồ thành phần Mermaid chi tiết, phân lớp đơn hướng và ma trận hạ tầng.
  - Cập nhật [`docs/architecture/database.md`](architecture/database.md): ERD Mermaid 9 bảng, đối chiếu migration thật, 6 vòng đời trạng thái và 7 bất biến dữ liệu.
  - Tạo mới [`docs/architecture/decisions.md`](architecture/decisions.md): Ghi nhận ADR-001 (Frontend Caddy trên EC2 `[CHƯA LÀM]`) và ADR-002 (Đơn máy chủ EC2 + Postgres trên EBS gp3, không dùng RDS `[ĐÃ CÓ]`).
  - Tạo mới [`docs/project/known-issues.md`](project/known-issues.md): Điểm lệch `TASK_DUE_SOON`, `App.tsx` monolith (1.505 dòng), Kanban position, S3 production `[CHƯA KIỂM CHỨNG]`.
  - Tạo mới [`docs/project/roadmap.md`](project/roadmap.md): Kế hoạch Email SES/MailHog `[CHƯA LÀM]`, scheduler `TASK_DUE_SOON` qua `@nestjs/schedule` `[CHƯA LÀM]`, Kanban position `[CHƯA LÀM]`, Recurring tasks.
- **Đã xong Bước 2 (Đặc tả các luồng hoạt động trọng yếu)**:
  - Tạo mới [`docs/architecture/flows.md`](architecture/flows.md): Đặc tả 5 luồng trọng yếu kèm Sequence Diagram Mermaid, file/hàm thật, nhánh lỗi, tác dụng phụ và dẫn chứng mã nguồn cho mọi khẳng định bảo mật.
- **Đã xong Tiền kiểm tra Bước 3**:
  - Xác minh `grep -rnE "tasks|collaboration|notifications" backend/src/projects/`: Không có import hay require động nào từ các module khác (chỉ có field `tasks:` trong object metrics).
  - Xác nhận `.github/workflows/cd.yml`: **ĐÃ CÓ** `concurrency` (`group: taskflow-production`, `cancel-in-progress: false`).
  - Kiểm tra `deploy/compose.production.yaml`: Xác định thiếu cấu hình log rotation và thiếu container healthcheck cho service `api`; đã bổ sung vào [`docs/project/known-issues.md`](project/known-issues.md).
- **Đã xong Bước 3 (Development, Modules & API Reference)**:
  - `development/`: Tạo mới [`docs/development/local-setup.md`](development/local-setup.md), [`docs/development/testing-guide.md`](development/testing-guide.md) và [`docs/development/conventions.md`](development/conventions.md) (quy ước code, checklist tính năng mới, checklist migration Expand/Contract).
  - `modules/`: Tạo mới đầy đủ các file đặc tả từng module backend gồm [`docs/modules/auth.md`](modules/auth.md), [`docs/modules/projects.md`](modules/projects.md), [`docs/modules/tasks.md`](modules/tasks.md), [`docs/modules/collaboration.md`](modules/collaboration.md), [`docs/modules/notifications.md`](modules/notifications.md) và [`docs/modules/health-and-telemetry.md`](modules/health-and-telemetry.md).
  - `api/`: Tạo mới [`docs/api/reference.md`](api/reference.md) với bảng danh mục đầy đủ toàn bộ endpoint từ controller thật (do chưa có `@nestjs/swagger`).
  - Đồng bộ mục lục tại [`docs/README.md`](README.md).

## Việc cần kiểm tra sau release đầu tiên
- **Kiểm thử xác minh tích hợp S3 Production** `[CHƯA KIỂM CHỨNG]`: Tệp đính kèm cần được kiểm thử tải lên và tải xuống thực tế từ trình duyệt đến Amazon S3 production trên EC2 sau release đầu tiên.
  - *Lưu ý quan trọng*: Cấu hình CORS của S3 bucket (`infra/terraform/main.tf`) bắt buộc phải có `allowed_origins` khớp chính xác với domain thật của ứng dụng khi đưa vào vận hành.

## Kẹt
- Không có.

## File liên quan
- [`docs/README.md`](README.md)
- [`docs/STATE.md`](STATE.md)
- [`docs/overview/product-overview.md`](overview/product-overview.md)
- [`docs/overview/requirements.md`](overview/requirements.md)
- [`docs/architecture/system-design.md`](architecture/system-design.md)
- [`docs/architecture/database.md`](architecture/database.md)
- [`docs/architecture/flows.md`](architecture/flows.md)
- [`docs/architecture/decisions.md`](architecture/decisions.md)
- [`docs/modules/auth.md`](modules/auth.md)
- [`docs/modules/projects.md`](modules/projects.md)
- [`docs/modules/tasks.md`](modules/tasks.md)
- [`docs/modules/collaboration.md`](modules/collaboration.md)
- [`docs/modules/notifications.md`](modules/notifications.md)
- [`docs/modules/health-and-telemetry.md`](modules/health-and-telemetry.md)
- [`docs/api/reference.md`](api/reference.md)
- [`docs/development/local-setup.md`](development/local-setup.md)
- [`docs/development/testing-guide.md`](development/testing-guide.md)
- [`docs/development/conventions.md`](development/conventions.md)
- [`docs/project/known-issues.md`](project/known-issues.md)
- [`docs/project/roadmap.md`](project/roadmap.md)
- [`docs/project/progress.md`](project/progress.md)
