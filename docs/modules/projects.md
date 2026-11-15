# Module Dự án & Phân quyền (Projects Module)

Tài liệu này đặc tả chi tiết module Dự án và Phân quyền (`backend/src/projects/`) của TaskFlow: quản lý vòng đời dự án, cơ chế phân quyền RBAC dựa trên membership, chuyển giao quyền sở hữu nguyên tử và tính toán chỉ số thống kê Dashboard.

---

## 1. Trách nhiệm (Responsibility)

- Quản lý vòng đời dự án: Tạo mới, cập nhật thông tin, lưu trữ (`archive`) và khôi phục (`restore`).
- Quản lý thành viên và ma trận phân quyền RBAC (`OWNER`, `MEMBER`, `VIEWER`).
- Đảm bảo bất biến một Chủ sở hữu duy nhất (Single Owner Invariant) và luồng chuyển quyền sở hữu nguyên tử.
- Cung cấp dịch vụ kiểm soát truy cập trung tâm `ProjectAccessService` cho các module khác (`tasks`, `collaboration`) nhằm phòng chống triệt để lỗ hổng IDOR.
- Tính toán các chỉ số thống kê tiến độ, phân bố trạng thái/mức ưu tiên và khối lượng công việc theo thành viên phục vụ Dashboard metrics.

---

## 2. API Công khai & Dịch vụ Xuất bản (Public Interface)

### 2.1. Endpoints HTTP
- `POST /projects`: Tạo dự án mới (`CreateProjectDto`: name, description). Người tạo tự động trở thành `OWNER`.
- `GET /projects`: Lấy danh sách các dự án mà người dùng tham gia (hỗ trợ lọc dự án đang hoạt động hoặc đã lưu trữ).
- `GET /projects/:projectId`: Xem thông tin chi tiết của một dự án.
- `PATCH /projects/:projectId`: Cập nhật tên hoặc mô tả dự án (chỉ `OWNER`).
- `DELETE /projects/:projectId`: Lưu trữ dự án (`archive` - đưa về trạng thái chỉ đọc, chỉ `OWNER`).
- `POST /projects/:projectId/restore`: Khôi phục dự án đã lưu trữ (chỉ `OWNER`).
- `GET /projects/:projectId/metrics`: Lấy báo cáo thống kê tiến độ, task quá hạn, tỷ lệ hoàn thành (mọi vai trò trong dự án đều được xem).
- `GET /projects/:projectId/members`: Lấy danh sách thành viên dự án và vai trò tương ứng.
- `POST /projects/:projectId/members`: Mời thành viên mới theo email (`AddProjectMemberDto`: email, role; chỉ `OWNER`).
- `PATCH /projects/:projectId/members/:userId`: Thay đổi vai trò thành viên (`UpdateProjectMemberDto`: role; chỉ `OWNER`).
- `DELETE /projects/:projectId/members/:userId`: Xóa thành viên khỏi dự án (chỉ `OWNER`).
- `POST /projects/:projectId/transfer-owner`: Chuyển quyền sở hữu dự án cho thành viên khác (`TransferProjectOwnerDto`: targetUserId; chỉ `OWNER`).

### 2.2. Dịch vụ Xuất bản (Exported Providers)
- `ProjectAccessService`: Cung cấp `requireMembership(projectId, userId)` (trả về thông tin vai trò hoặc ném lỗi 403) và `requireRole(projectId, userId, allowedRoles)` (kiểm tra quyền ghi).
- `ProjectService`: Cung cấp các thao tác nghiệp vụ trên dự án và thành viên.

---

## 3. Phụ thuộc Hai chiều (Dependencies)

- **Phụ thuộc vào (Outgoing Dependencies)**:
  - `PrismaModule` (`PrismaService`): Thao tác với các bảng `projects`, `project_members`, `users`, `tasks`.
  - `AuthModule` (`AccessTokenGuard`): Bảo vệ toàn bộ endpoint trong `ProjectController`.
- **Được phụ thuộc bởi (Incoming Dependencies)**:
  - `TasksModule` & `CollaborationModule`: Đều import `ProjectsModule` để tiêm (inject) `ProjectAccessService` phục vụ kiểm tra quyền hạn trước khi thao tác với task, comment hoặc attachment.
- **Quy tắc ngăn chặn phụ thuộc vòng**: `ProjectsModule` **tuyệt đối không import** `TasksModule`, `CollaborationModule` hay `NotificationsModule`.

---

## 4. Các File Chính trong Mã nguồn

- `backend/src/projects/projects.module.ts`: Cấu hình module và xuất bản `ProjectAccessService`, `ProjectService`.
- `backend/src/projects/project.controller.ts`: Tiếp nhận HTTP requests, kiểm tra guard xác thực và gọi service.
- `backend/src/projects/project.service.ts`: Logic nghiệp vụ quản lý dự án, thành viên, chuyển quyền và tính toán metrics.
- `backend/src/projects/project-access.service.ts`: Xử lý kiểm tra phân quyền RBAC tập trung và chống IDOR.
- `backend/src/projects/dto/*.dto.ts`: Bộ DTO kiểm tra dữ liệu đầu vào (`CreateProjectDto`, `UpdateProjectDto`, `AddProjectMemberDto`, `UpdateProjectMemberDto`, `TransferProjectOwnerDto`).

---

## 5. Bẫy Kỹ thuật & Điều Dễ Hiểu Nhầm (Pitfalls & Gotchas)

1. **Lưu trữ dự án (Archive) là Xóa mềm mức dự án**:
   - Khi gọi `DELETE /projects/:id`, hệ thống **không xóa bản ghi** mà chỉ đặt `archivedAt = now()`.
   - Một khi dự án đã bị lưu trữ, toàn bộ dự án trở thành **Chỉ đọc (Read-only)** đối với tất cả thành viên (kể cả Owner). Mọi thao tác thêm task, sửa task, bình luận hay đính kèm tệp đều bị `TaskService` và `CollaborationService` chặn lại với mã lỗi 400 (`Dự án đã được lưu trữ, không thể chỉnh sửa`).
2. **Bất biến Chủ sở hữu Duy nhất (Single Owner Invariant)**:
   - Trong mỗi dự án, luôn có duy nhất một thành viên giữ vai trò `OWNER`.
   - Chủ sở hữu **không thể tự xóa mình** khỏi dự án (`DELETE /projects/:id/members/:ownerId` sẽ bị chặn với lỗi `Chủ sở hữu không thể rời khỏi dự án`). Owner buộc phải chuyển giao quyền sở hữu cho người khác trước.
3. **Chuyển quyền sở hữu là Giao dịch Hoán đổi Nguyên tử**:
   - API `POST /projects/:id/transfer-owner` thực thi trong `prisma.$transaction`: thăng cấp thành viên đích lên `OWNER` và đồng thời giáng cấp Owner hiện tại xuống `MEMBER`. Điều này đảm bảo không bao giờ xảy ra trạng thái dự án có 2 Owner hoặc không có Owner nào.
4. **IDOR Protection là bắt buộc**:
   - Việc người dùng biết UUID của một dự án không mang lại quyền hạn gì. `ProjectAccessService` luôn tra cứu bảng `project_members` theo cặp khóa chính `(projectId, userId)` để xác thực quyền trước khi thực thi bất kỳ logic nào.

---

## 6. Kiểm thử Liên quan (Tests)

- **E2E Test Backend**: `backend/test/projects-tasks.e2e-spec.ts` (kiểm thử tạo dự án, phân quyền RBAC Owner/Member/Viewer, chuyển quyền sở hữu, lưu trữ và khôi phục dự án).
