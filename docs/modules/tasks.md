# Module Công việc & Bảng Kanban (Tasks Module)

Tài liệu này đặc tả chi tiết module Công việc (`backend/src/tasks/`) của TaskFlow: quản lý vòng đời task, công việc con một cấp, bảng kéo-thả Kanban, cơ chế xóa mềm/khôi phục, tích hợp kích hoạt thông báo sự kiện và xuất dữ liệu CSV chuẩn UTF-8.

---

## 1. Trách nhiệm (Responsibility)

- CRUD công việc chính và công việc con (sub-tasks) với giới hạn nghiêm ngặt tối đa một cấp.
- Quản lý trạng thái (`TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`) và mức ưu tiên (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
- Phân công người thực hiện (`assigneeId`) kèm kiểm tra tính hợp lệ về tư cách thành viên dự án.
- Thiết lập hạn hoàn thành (`dueAt`) phục vụ theo dõi tiến độ và thống kê quá hạn.
- Cơ chế xóa mềm (`deletedAt`) và khôi phục công việc, bảo toàn toàn vẹn dữ liệu bình luận và tệp đính kèm.
- Kích hoạt thông báo in-app tự động qua `NotificationService` khi được giao việc hoặc khi trạng thái công việc thay đổi.
- Xuất toàn bộ danh sách công việc của dự án thành file `.csv` chuẩn RFC 4180 kèm ký tự nhận diện UTF-8 BOM (`\uFEFF`).

---

## 2. API Công khai & Dịch vụ Xuất bản (Public Interface)

### 2.1. Endpoints HTTP
- `POST /projects/:projectId/tasks`: Tạo công việc mới (`CreateTaskDto`: title, description, status, priority, position, dueAt, assigneeId, parentTaskId). Chỉ `OWNER` và `MEMBER`.
- `GET /projects/:projectId/tasks`: Lấy danh sách công việc của dự án (`ListTasksDto`: lọc theo status, priority, includeDeleted; sắp xếp theo `position asc, createdAt desc`). Mọi thành viên đều được xem.
- `GET /projects/:projectId/tasks/export`: Xuất danh sách công việc ra định dạng CSV (trả về header `Content-Disposition: attachment; filename=tasks-*.csv`).
- `GET /projects/:projectId/tasks/:taskId`: Xem thông tin chi tiết của một công việc kèm danh sách sub-tasks, người được giao và người tạo.
- `PATCH /projects/:projectId/tasks/:taskId`: Cập nhật công việc (`UpdateTaskDto`: title, description, status, priority, position, dueAt, assigneeId). Chỉ `OWNER` và `MEMBER`.
- `DELETE /projects/:projectId/tasks/:taskId`: Xóa mềm công việc (cập nhật `deletedAt = now()`). Chỉ `OWNER` và `MEMBER`.
- `POST /projects/:projectId/tasks/:taskId/restore`: Khôi phục công việc đã xóa mềm (cập nhật `deletedAt = null`). Chỉ `OWNER` và `MEMBER`.

### 2.2. Dịch vụ Xuất bản (Exported Providers)
- `TaskService`: Cung cấp các thao tác nghiệp vụ trên task, xử lý tính toán `position` Kanban, xóa mềm và xuất file CSV.

---

## 3. Phụ thuộc Hai chiều (Dependencies)

- **Phụ thuộc vào (Outgoing Dependencies)**:
  - `ProjectsModule` (`ProjectAccessService`): Kiểm tra quyền ghi (`requireRole`) và quyền xem (`requireMembership`).
  - `NotificationsModule` (`NotificationService`): Kích hoạt thông báo in-app sự kiện gán việc và đổi trạng thái.
  - `PrismaModule` (`PrismaService`): Thao tác với các bảng `tasks`, `project_members`, `projects`.
  - `AuthModule` (`AccessTokenGuard`): Bảo vệ các route API.
- **Được phụ thuộc bởi (Incoming Dependencies)**:
  - Không có module nào import `TasksModule` trực tiếp (các thao tác cộng tác như comment và attachment được định tuyến qua `CollaborationModule`).

---

## 4. Các File Chính trong Mã nguồn

- `backend/src/tasks/tasks.module.ts`: Khai báo module, import `ProjectsModule`, `NotificationsModule` và xuất bản `TaskService`.
- `backend/src/tasks/task.controller.ts`: Tiếp nhận HTTP requests, kiểm tra guard xác thực và gọi service.
- `backend/src/tasks/task.service.ts`: Toàn bộ logic nghiệp vụ task, sub-task, soft-delete, tính vị trí `position`, export CSV và trigger notification.
- `backend/src/tasks/dto/*.dto.ts`: Bộ DTO kiểm tra dữ liệu đầu vào (`CreateTaskDto`, `UpdateTaskDto`, `ListTasksDto`).
- `frontend/src/components/tasks/KanbanBoard.tsx`: Component bảng kéo-thả Kanban, xử lý Fractional Indexing, drop indicators và optimistic update.

---

## 5. Bẫy Kỹ thuật & Điều Dễ Hiểu Nhầm (Pitfalls & Gotchas)

1. **Ràng buộc Sub-task Tối đa Một Cấp (Max 1 Level Sub-task)**:
   - Hệ thống không hỗ trợ cây phân cấp công việc lồng nhau vô hạn. Nếu truyền `parentTaskId` trỏ tới một task mà bản thân task đó cũng có `parentTaskId != null`, `TaskService.create` sẽ ném lỗi 400 Bad Request (`Subtasks cannot be nested.`).
2. **Task cha là Bất biến (Immutable Parent)**:
   - Một khi công việc đã được tạo, bạn **không thể thay đổi task cha** bằng lệnh cập nhật (`PATCH /tasks/:id`). Nếu DTO có chứa trường `parentTaskId`, `TaskService.update` sẽ lập tức từ chối với lỗi 400 (`Task parent cannot be modified.`).
3. **Người được giao (Assignee) bắt buộc phải là Thành viên Dự án**:
   - Khi gán `assigneeId`, service luôn kiểm tra sự tồn tại của người dùng trong bảng `project_members` của chính dự án đó. Không thể gán một công việc cho người ngoài dự án.
4. **Sắp xếp Thứ tự Tùy ý trên Bảng Kanban (Đã Hoàn tất)**:
   - Bảng `tasks` lưu trường `position Float @default(65536.0)`. Khi kéo-thả trên `KanbanBoard.tsx`, hệ thống tính toán vị trí mới bằng thuật toán Fractional Indexing (`(prevPos + nextPos) / 2`), hỗ trợ cả di chuyển giữa các cột trạng thái lẫn kéo đổi thứ tự ưu tiên trong cùng một cột mà không cần cập nhật lại toàn bộ các thẻ khác.
5. **Định dạng Xuất CSV và UTF-8 BOM**:
   - Endpoint `/tasks/export` trả về chuỗi CSV có đính kèm UTF-8 BOM (`\uFEFF`) ở đầu stream. Mục đích là để Microsoft Excel tự động nhận diện bảng mã tiếng Việt có dấu mà không bị lỗi font. Nếu đọc file này bằng các script tự động bên ngoài, cần lưu ý xử lý ký tự BOM này.

---

## 6. Kiểm thử Liên quan (Tests)

- **Unit Test Service**: `backend/src/tasks/task.service.spec.ts` (kiểm thử `list` sắp xếp theo position, `create` tự động gán position tiếp theo, `update` vị trí).
- **E2E Test Backend**: `backend/test/projects-tasks.e2e-spec.ts` (kiểm thử tạo task, subtask 1 cấp, đổi trạng thái, xóa mềm, khôi phục và xuất file CSV).
