# Đặc tả Giao diện Lập trình REST API (API Reference)

Tài liệu này cung cấp danh mục đặc tả toàn bộ các endpoint REST API của TaskFlow, đối chiếu trực tiếp từ các Controller trong mã nguồn `backend/src/`. Bảng đặc tả bao gồm phương thức HTTP, đường dẫn, quyền truy cập yêu cầu, dữ liệu đầu vào (DTO/Query/Cookie), cấu trúc phản hồi và các mã lỗi có thể xảy ra.

> **Ghi chú**: Dự án hiện chưa tích hợp thư viện `@nestjs/swagger` (`swagger-ui`). Mọi định nghĩa dưới đây phản ánh chính xác cấu trúc mã nguồn thực tế tại các Controller và DTO.

---

## 1. Chuẩn Quy ước Chung của API

- **Header Xác thực**: Mọi endpoint yêu cầu xác thực phải gửi kèm header:
  ```http
  Authorization: Bearer <jwt-access-token>
  ```
- **Cookie Phiên**: Cookie `taskflow_refresh` được quản lý tự động bởi trình duyệt với các cờ `HttpOnly`, `SameSite=Lax`, `Path=/auth`.
- **Định dạng Dữ liệu**: Mọi request body và response body (ngoại trừ file export CSV) đều sử dụng định dạng `application/json`.
- **Mã lỗi Chuẩn HTTP**:
  - `400 Bad Request`: Dữ liệu đầu vào không hợp lệ hoặc vi phạm quy tắc nghiệp vụ.
  - `401 Unauthorized`: Chưa xác thực, token JWT sai/hết hạn hoặc refresh token bị thu hồi.
  - `403 Forbidden`: Người dùng không có quyền trên tài nguyên (ví dụ: `VIEWER` cố ghi dữ liệu, hoặc không thuộc dự án).
  - `404 Not Found`: Tài nguyên không tồn tại hoặc đã bị xóa mềm.
  - `409 Conflict`: Xung đột dữ liệu duy nhất (ví dụ: email đã được đăng ký).
  - `500 Internal Server Error`: Lỗi máy chủ không mong muốn.

---

## 2. Bảng Danh mục API Endpoints

### 2.1. Module Xác thực (`/auth`)

| Method | Path | Quyền truy cập | Dữ liệu đầu vào (Input) | Dữ liệu đầu ra (Output) | Mã lỗi chính |
|---|---|---|---|---|---|
| `POST` | `/auth/register` | Public | **Body**: `{ email, password, name? }` | `201 Created`: `{ accessToken, tokenType, expiresIn, user }` + Cookie `taskflow_refresh` | `400`, `409` |
| `POST` | `/auth/login` | Public | **Body**: `{ email, password }` | `200 OK`: `{ accessToken, tokenType, expiresIn, user }` + Cookie `taskflow_refresh` | `400`, `401` |
| `POST` | `/auth/refresh` | Public (qua Cookie) | **Cookie**: `taskflow_refresh` | `200 OK`: `{ accessToken, tokenType, expiresIn, user }` + Cookie `taskflow_refresh` mới | `401` |
| `POST` | `/auth/logout` | Public (qua Cookie) | **Cookie**: `taskflow_refresh` | `204 No Content` (Xóa cookie `taskflow_refresh`) | `204` |
| `GET` | `/auth/me` | Bearer JWT | **Header**: `Authorization` | `200 OK`: `{ id, email, name, createdAt }` | `401`, `404` |

---

### 2.2. Module Dự án & Thành viên (`/projects`)

| Method | Path | Quyền truy cập | Dữ liệu đầu vào (Input) | Dữ liệu đầu ra (Output) | Mã lỗi chính |
|---|---|---|---|---|---|
| `POST` | `/projects` | Bearer JWT | **Body**: `{ name, description? }` | `201 Created`: Thông tin dự án mới (`id`, `name`, `description`, `createdById`, `createdAt`...) | `400`, `401` |
| `GET` | `/projects` | Bearer JWT | **Query**: `archived?: string` (`"true"`/`"false"`) | `200 OK`: Mảng các dự án người dùng tham gia | `401` |
| `GET` | `/projects/:projectId` | Member / Owner / Viewer | **Param**: `projectId` (UUID) | `200 OK`: Chi tiết dự án kèm vai trò hiện tại của người gọi | `401`, `403`, `404` |
| `PATCH` | `/projects/:projectId` | `OWNER` | **Param**: `projectId`<br>**Body**: `{ name?, description? }` | `200 OK`: Chi tiết dự án đã cập nhật | `400`, `401`, `403`, `404` |
| `DELETE` | `/projects/:projectId` | `OWNER` | **Param**: `projectId` | `200 OK`: `{ message: "Dự án đã được lưu trữ." }` | `400`, `401`, `403`, `404` |
| `POST` | `/projects/:projectId/restore` | `OWNER` | **Param**: `projectId` | `200 OK`: Chi tiết dự án đã khôi phục (`archivedAt: null`) | `400`, `401`, `403`, `404` |
| `GET` | `/projects/:projectId/metrics` | Member / Owner / Viewer | **Param**: `projectId` | `200 OK`: Thống kê tổng task, byStatus, byPriority, overdue, dueSoon, completionRate, member breakdown | `401`, `403`, `404` |
| `GET` | `/projects/:projectId/members` | Member / Owner / Viewer | **Param**: `projectId` | `200 OK`: Danh sách thành viên kèm `role`, `joinedAt`, thông tin user | `401`, `403`, `404` |
| `POST` | `/projects/:projectId/members` | `OWNER` | **Param**: `projectId`<br>**Body**: `{ email, role: "MEMBER" \| "VIEWER" }` | `201 Created`: Bản ghi `project_members` mới | `400`, `401`, `403`, `404`, `409` |
| `PATCH` | `/projects/:projectId/members/:userId` | `OWNER` | **Param**: `projectId`, `userId`<br>**Body**: `{ role: "MEMBER" \| "VIEWER" }` | `200 OK`: Bản ghi membership đã cập nhật vai trò | `400`, `401`, `403`, `404` |
| `DELETE` | `/projects/:projectId/members/:userId` | `OWNER` | **Param**: `projectId`, `userId` | `200 OK`: `{ message: "Đã xóa thành viên." }` (Chặn xóa Owner) | `400`, `401`, `403`, `404` |
| `POST` | `/projects/:projectId/transfer-owner` | `OWNER` | **Param**: `projectId`<br>**Body**: `{ targetUserId }` | `200 OK`: `{ message: "Chuyển quyền sở hữu thành công." }` | `400`, `401`, `403`, `404` |

---

### 2.3. Module Công việc (`/projects/:projectId/tasks`)

| Method | Path | Quyền truy cập | Dữ liệu đầu vào (Input) | Dữ liệu đầu ra (Output) | Mã lỗi chính |
|---|---|---|---|---|---|
| `POST` | `/projects/:projectId/tasks` | `OWNER`, `MEMBER` | **Param**: `projectId`<br>**Body**: `{ title, description?, status?, priority?, dueAt?, assigneeId?, parentTaskId? }` | `201 Created`: Bản ghi task mới tạo | `400`, `401`, `403`, `404` |
| `GET` | `/projects/:projectId/tasks` | Member / Owner / Viewer | **Param**: `projectId`<br>**Query**: `status?`, `priority?`, `includeDeleted?` | `200 OK`: Mảng danh sách công việc | `401`, `403` |
| `GET` | `/projects/:projectId/tasks/export` | Member / Owner / Viewer | **Param**: `projectId` | `200 OK`: File CSV RFC 4180 có UTF-8 BOM (`Content-Type: text/csv`) | `401`, `403` |
| `GET` | `/projects/:projectId/tasks/:taskId` | Member / Owner / Viewer | **Param**: `projectId`, `taskId` | `200 OK`: Chi tiết task kèm subtasks, assignee, comments, attachments | `401`, `403`, `404` |
| `PATCH` | `/projects/:projectId/tasks/:taskId` | `OWNER`, `MEMBER` | **Param**: `projectId`, `taskId`<br>**Body**: `{ title?, description?, status?, priority?, dueAt?, assigneeId? }` | `200 OK`: Bản ghi task sau khi cập nhật | `400`, `401`, `403`, `404` |
| `DELETE` | `/projects/:projectId/tasks/:taskId` | `OWNER`, `MEMBER` | **Param**: `projectId`, `taskId` | `200 OK`: `{ message: "Task đã được xóa mềm." }` | `400`, `401`, `403`, `404` |
| `POST` | `/projects/:projectId/tasks/:taskId/restore` | `OWNER`, `MEMBER` | **Param**: `projectId`, `taskId` | `200 OK`: Bản ghi task sau khi khôi phục (`deletedAt: null`) | `400`, `401`, `403`, `404` |

---

### 2.4. Module Cộng tác: Bình luận & Tệp đính kèm

| Method | Path | Quyền truy cập | Dữ liệu đầu vào (Input) | Dữ liệu đầu ra (Output) | Mã lỗi chính |
|---|---|---|---|---|---|
| `GET` | `.../tasks/:taskId/comments` | Member / Owner / Viewer | **Param**: `projectId`, `taskId` | `200 OK`: Danh sách bình luận theo thứ tự thời gian | `401`, `403`, `404` |
| `POST` | `.../tasks/:taskId/comments` | `OWNER`, `MEMBER` | **Param**: `projectId`, `taskId`<br>**Body**: `{ body }` (tối đa 5.000 ký tự) | `201 Created`: Bản ghi bình luận mới tạo | `400`, `401`, `403`, `404` |
| `PATCH` | `.../tasks/:taskId/comments/:commentId` | Tác giả bình luận | **Param**: `projectId`, `taskId`, `commentId`<br>**Body**: `{ body }` | `200 OK`: Bản ghi bình luận đã cập nhật | `400`, `401`, `403`, `404` |
| `DELETE` | `.../tasks/:taskId/comments/:commentId` | Tác giả hoặc `OWNER` | **Param**: `projectId`, `taskId`, `commentId` | `200 OK`: `{ message: "Đã xóa bình luận." }` | `401`, `403`, `404` |
| `GET` | `.../tasks/:taskId/attachments` | Member / Owner / Viewer | **Param**: `projectId`, `taskId` | `200 OK`: Danh sách tệp đính kèm đã kích hoạt | `401`, `403`, `404` |
| `POST` | `.../tasks/:taskId/attachments` | `OWNER`, `MEMBER` | **Param**: `projectId`, `taskId`<br>**Body**: `{ fileName, contentType, sizeBytes }` | `201 Created`: `{ uploadUrl, objectKey }` (Presigned PUT URL 5 phút) | `400`, `401`, `403`, `404` |
| `POST` | `.../tasks/:taskId/attachments/confirm` | `OWNER`, `MEMBER` | **Param**: `projectId`, `taskId`<br>**Body**: `{ objectKey, fileName, contentType, sizeBytes }` | `201 Created`: Bản ghi `Attachment` kích hoạt thành công sau `HeadObject` | `400`, `401`, `403`, `404` |
| `GET` | `.../tasks/:taskId/attachments/:id/download` | Member / Owner / Viewer | **Param**: `projectId`, `taskId`, `id` | `200 OK`: `{ downloadUrl }` (Presigned GET URL 5 phút) | `401`, `403`, `404` |
| `DELETE` | `.../tasks/:taskId/attachments/:id` | Người tải lên hoặc `OWNER` | **Param**: `projectId`, `taskId`, `id` | `200 OK`: `{ message: "Đã xóa tệp đính kèm." }` | `401`, `403`, `404` |

---

### 2.5. Module Thông báo In-app (`/notifications`)

| Method | Path | Quyền truy cập | Dữ liệu đầu vào (Input) | Dữ liệu đầu ra (Output) | Mã lỗi chính |
|---|---|---|---|---|---|
| `GET` | `/notifications` | Bearer JWT | **Query**: `limit?: string` (1-100, mặc định 50) | `200 OK`: `{ notifications: [...], unreadCount: number }` | `401` |
| `PATCH` | `/notifications/:id/read` | Bearer JWT | **Param**: `id` (UUID) | `200 OK`: Bản ghi thông báo với `isRead: true`, `readAt` | `401`, `404` |
| `POST` | `/notifications/read-all` | Bearer JWT | Không có body | `200 OK`: `{ updatedCount: number }` | `401` |

---

### 2.6. Module Giám sát Trạng thái & Phiên bản (`/health`, `/version`)

| Method | Path | Quyền truy cập | Dữ liệu đầu vào (Input) | Dữ liệu đầu ra (Output) | Mã lỗi chính |
|---|---|---|---|---|---|
| `GET` | `/health/live` | Public | Không | `200 OK`: `{ status: "ok" }` | `500` |
| `GET` | `/health/ready` | Public | Không | `200 OK`: `{ status: "ok", info: { database: { status: "up" } } }` | `503 Service Unavailable` |
| `GET` | `/version` | Public | Không | `200 OK`: `{ gitSha: string, buildTime: string }` | `200` |
