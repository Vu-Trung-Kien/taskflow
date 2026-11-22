# Đặc tả Giao diện Lập trình REST API (API Reference)

Tài liệu này cung cấp danh mục đặc tả toàn bộ các endpoint REST API của TaskFlow, đối chiếu trực tiếp từ các Controller trong mã nguồn `backend/src/`. Bảng đặc tả bao gồm phương thức HTTP, đường dẫn, quyền truy cập yêu cầu, dữ liệu đầu vào (DTO/Query/Cookie), cấu trúc phản hồi và các mã lỗi có thể xảy ra.

> **Ghi chú**: Tài liệu Swagger/OpenAPI tương tác được phục vụ tại `/api-docs`; tài liệu này là đặc tả REST chi tiết và vẫn là nguồn đối chiếu cho quy ước lỗi, dữ liệu đầu vào và quyền truy cập.

---

## 1. Chuẩn Quy ước Chung của API

- **Header Xác thực**: Mọi endpoint yêu cầu xác thực phải gửi kèm header:
  ```http
  Authorization: Bearer <jwt-access-token>
  ```
- **Cookie Phiên**: Cookie `taskflow_refresh` được quản lý tự động bởi trình duyệt với các cờ `HttpOnly`, `SameSite=Lax`, `Path=/auth`.
- **Định dạng Dữ liệu**: Mọi request body và response body (ngoại trừ file export CSV) đều sử dụng định dạng `application/json`.
- **Cấu trúc lỗi chuẩn**: Các lỗi do NestJS xác thực hoặc nghiệp vụ thường trả JSON theo dạng:
  ```json
  {
    "statusCode": 400,
    "message": "Thông báo lỗi cụ thể",
    "error": "Bad Request"
  }
  ```
  Với lỗi xác thực nhiều trường, `message` có thể là mảng chuỗi do `class-validator` trả về.

### 1.1. Bảng mã lỗi chính

| Mã HTTP | Nhóm lỗi | Khi nào xảy ra | Hành vi phía client |
|---|---|---|---|
| `400 Bad Request` | Request không hợp lệ | Thiếu trường bắt buộc; sai kiểu/định dạng UUID, enum, email hoặc ISO 8601; payload vi phạm `whitelist`/`forbidNonWhitelisted`; mật khẩu mới trùng mật khẩu hiện tại; không có trường nào để cập nhật; dung lượng/loại tệp không hợp lệ. | Kiểm tra `message`/chi tiết xác thực; không retry khi chưa sửa dữ liệu; giữ người dùng trên form hiện tại và hiển thị lỗi theo trường nếu có thể. |
| `401 Unauthorized` | Không có phiên hợp lệ | Thiếu Bearer token; access token sai hoặc hết hạn; refresh token thiếu, sai, hết hạn hoặc đã bị revoke; tài khoản không còn khả dụng. | Xóa access token trong bộ nhớ khi cần, thử refresh một lần, chuyển `/login` nếu refresh thất bại. Không gửi lại tác vụ ghi có chứa dữ liệu nhạy cảm. |
| `403 Forbidden` | Không đủ quyền | Không thuộc dự án; vai trò `VIEWER` thực hiện thao tác ghi; endpoint yêu cầu `OWNER`; không phải tác giả bình luận; không phải người tải tệp hoặc `OWNER`. | Dừng thao tác, ẩn hoặc disable action không được phép và thông báo người dùng không có quyền. |
| `404 Not Found` | Tài nguyên không tồn tại | Project, task, thành viên, bình luận, attachment hoặc notification không tồn tại; tài nguyên thuộc project khác; task/bản ghi đã bị soft-delete. | Làm mới danh sách/điều hướng quay lại trang hợp lệ. Không coi đây là lỗi xác thực. |
| `409 Conflict` | Xung đột trạng thái/dữ liệu | Email đã đăng ký; email đã là thành viên; cố chuyển/xóa Owner; Owner muốn khôi phục sai thứ tự; restore sub-task khi task cha đã bị xóa; attachment đã kích hoạt hoặc object storage xung đột. | Giữ trạng thái hiện tại và yêu cầu người dùng giải quyết xung đột, ví dụ refresh dữ liệu hoặc chuyển Owner trước. |
| `429 Too Many Requests` | Vượt giới hạn tần suất | Gửi quá nhiều request tới các route xác thực nhạy cảm theo cấu hình `AUTH_RATE_LIMIT_TTL` và `AUTH_RATE_LIMIT_MAX`. | Tôn trọng `Retry-After` nếu được trả về; disable nút đăng nhập/đăng ký trong khoảng chờ và hiển thị thông báo. |
| `503 Service Unavailable` | Dịch vụ phụ/ready check không sẵn sàng | `/health/ready` không kết nối được PostgreSQL hoặc một dependency trạng thái readiness không còn khỏe. | Giữ liveness riêng với `/health/live`; kích hoạt cảnh báo vận hành hoặc retry có backoff. |
| `500 Internal Server Error` | Lỗi máy chủ không mong muốn | Lỗi runtime, database, object storage hoặc external service chưa được ánh xạ sang exception nghiệp vụ. | Không hiển thị stack trace/secret cho người dùng; ghi log, retry có kiểm soát hoặc báo lỗi chung. |

### 1.2. Quy tắc mã hóa lỗi theo nhóm nghiệp vụ

| Nhóm | Các mã thường gặp | Ví dụ nguyên nhân |
|---|---|---|
| Xác thực | `400`, `401`, `409`, `429` | DTO xác thực sai; sai email/mật khẩu; email trùng; refresh/replay phiên; rate limiting. |
| Dự án & thành viên | `400`, `401`, `403`, `404`, `409` | Thiếu tên dự án; không phải Owner; project/task không tồn tại; thành viên đã tồn tại; cấm thao tác với Owner. |
| Công việc & Kanban | `400`, `401`, `403`, `404`, `409` | Không có field cập nhật; `position` không phải số hợp lệ; assignee không thuộc project; task cha/soft-delete không hợp lệ. |
| Bình luận & đính kèm | `400`, `401`, `403`, `404`, `409` | Content quá dài; file vượt 10 MiB/MIME không cho phép; không phải tác giả hoặc Owner; object không tồn tại. |
| Notifications | `401`, `404` | Phiên hết hạn hoặc notification không thuộc người dùng hiện tại. |
| Health/Version | `200`, `503`, `500` | API sống/chạy bình thường, database chưa sẵn sàng, hoặc lỗi runtime. |

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
| `PATCH` | `/auth/profile` | Bearer JWT | **Body**: `{ name?: string }` | `200 OK`: `{ id, email, name }` | `400`, `401` |
| `POST` | `/auth/change-password` | Bearer JWT | **Body**: `{ currentPassword, newPassword }` | `200 OK`: `{ message: "Mật khẩu đã được thay đổi thành công." }` | `400`, `401`, `429` |

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
| `POST` | `/projects/:projectId/tasks` | `OWNER`, `MEMBER` | **Param**: `projectId`<br>**Body**: `{ title, description?, status?, priority?, position?, dueAt?, assigneeId?, parentTaskId? }` | `201 Created`: Bản ghi task mới tạo | `400`, `401`, `403`, `404` |
| `GET` | `/projects/:projectId/tasks` | Member / Owner / Viewer | **Param**: `projectId`<br>**Query**: `status?`, `priority?`, `includeDeleted?` | `200 OK`: Mảng danh sách công việc | `401`, `403` |
| `GET` | `/projects/:projectId/tasks/export` | Member / Owner / Viewer | **Param**: `projectId` | `200 OK`: File CSV RFC 4180 có UTF-8 BOM (`Content-Type: text/csv`) | `401`, `403` |
| `GET` | `/projects/:projectId/tasks/:taskId` | Member / Owner / Viewer | **Param**: `projectId`, `taskId` | `200 OK`: Chi tiết task kèm subtasks, assignee, comments, attachments | `401`, `403`, `404` |
| `PATCH` | `/projects/:projectId/tasks/:taskId` | `OWNER`, `MEMBER` | **Param**: `projectId`, `taskId`<br>**Body**: `{ title?, description?, status?, priority?, position?, dueAt?, assigneeId? }` | `200 OK`: Bản ghi task sau khi cập nhật | `400`, `401`, `403`, `404` |
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

---

## 3. Ý nghĩa Mã Lỗi Theo Từng API

Các dòng dưới đây mô tả **điều kiện cụ thể** khiến từng endpoint trả mã lỗi. Nếu một endpoint không liệt kê một mã, mã đó không phải là kết quả nghiệp vụ chính của endpoint đó.

### 3.1. Xác thực

| API | Mã | Ý nghĩa cụ thể |
|---|---|---|
| `POST /auth/register` | `400` | Email, mật khẩu hoặc name không hợp lệ; tên trống hoặc vượt giới hạn. |
| `POST /auth/register` | `409` | Email đã tồn tại trong hệ thống. |
| `POST /auth/login` | `400` | Thiếu email/mật khẩu hoặc dữ liệu không đúng DTO. |
| `POST /auth/login` | `401` | Email hoặc mật khẩu sai; tài khoản không còn khả dụng. |
| `POST /auth/login` | `429` | Vượt giới hạn đăng nhập trong khoảng thời gian được cấu hình. |
| `POST /auth/refresh` | `401` | Thiếu cookie refresh, refresh token sai/hết hạn/bị revoke hoặc phiên không còn hợp lệ. |
| `POST /auth/logout` | `204` | Hủy phiên thành công; không có body trả về. |
| `GET /auth/me` | `401` | Thiếu/sai/hết hạn access token hoặc phiên đã bị thu hồi. |
| `GET /auth/me` | `404` | Không tìm thấy tài khoản gắn với phiên hợp lệ. |
| `PATCH /auth/profile` | `400` | `name` không phải chuỗi hợp lệ hoặc độ dài ngoài 1-100 ký tự. |
| `PATCH /auth/profile` | `401` | Access token không hợp lệ/hết hạn hoặc phiên không còn hợp lệ. |
| `POST /auth/change-password` | `400` | Thiếu mật khẩu; mật khẩu mới dưới 12 ký tự; mật khẩu mới trùng mật khẩu hiện tại. |
| `POST /auth/change-password` | `401` | Access token không hợp lệ hoặc `currentPassword` không đúng. |
| `POST /auth/change-password` | `429` | Vượt giới hạn request đổi mật khẩu. |

### 3.2. Dự án và thành viên

| API | Mã | Ý nghĩa cụ thể |
|---|---|---|
| `POST /projects` | `400` | `name` không hợp lệ hoặc description vượt giới hạn; thiếu dữ liệu bắt buộc. |
| `POST /projects` | `401` | Không có hoặc không có access token hợp lệ. |
| `GET /projects` | `401` | Phiên truy cập không hợp lệ. |
| `GET /projects/:projectId` | `401` | Thiếu access token hoặc phiên hết hạn. |
| `GET /projects/:projectId` | `403` | Người gọi không phải thành viên dự án. |
| `GET /projects/:projectId` | `404` | Project không tồn tại. |
| `PATCH /projects/:projectId` | `400` | Không có trường cập nhật hoặc tên/mô tả không hợp lệ. |
| `PATCH /projects/:projectId` | `401` | Phiên truy cập không hợp lệ. |
| `PATCH /projects/:projectId` | `403` | Người gọi không phải `OWNER`. |
| `PATCH /projects/:projectId` | `404` | Project không tồn tại hoặc đã bị xóa. |
| `DELETE /projects/:projectId` | `400` | Project đã ở trạng thái không thể lưu trữ tiếp. |
| `DELETE /projects/:projectId` | `401` | Phiên truy cập không hợp lệ. |
| `DELETE /projects/:projectId` | `403` | Người gọi không phải `OWNER`. |
| `DELETE /projects/:projectId` | `404` | Project không tồn tại. |
| `POST /projects/:projectId/restore` | `400` | Trạng thái hiện tại không cho phép khôi phục. |
| `POST /projects/:projectId/restore` | `401` | Phiên truy cập không hợp lệ. |
| `POST /projects/:projectId/restore` | `403` | Người gọi không phải `OWNER`. |
| `POST /projects/:projectId/restore` | `404` | Project không tồn tại hoặc không ở trạng thái đã lưu trữ. |
| `GET /projects/:projectId/metrics` | `401` | Phiên truy cập không hợp lệ. |
| `GET /projects/:projectId/metrics` | `403` | Người gọi không thuộc dự án. |
| `GET /projects/:projectId/metrics` | `404` | Project không tồn tại. |
| `GET /projects/:projectId/members` | `401` | Phiên truy cập không hợp lệ. |
| `GET /projects/:projectId/members` | `403` | Người gọi không thuộc dự án. |
| `GET /projects/:projectId/members` | `404` | Project không tồn tại. |
| `POST /projects/:projectId/members` | `400` | Email/role không hợp lệ hoặc thiếu dữ liệu bắt buộc. |
| `POST /projects/:projectId/members` | `401` | Phiên truy cập không hợp lệ. |
| `POST /projects/:projectId/members` | `403` | Người gọi không phải `OWNER`. |
| `POST /projects/:projectId/members` | `404` | Project hoặc user theo email không tồn tại. |
| `POST /projects/:projectId/members` | `409` | User đã là thành viên dự án. |
| `PATCH /projects/:projectId/members/:userId` | `400` | Role không thuộc `MEMBER`/`VIEWER` hoặc dữ liệu không hợp lệ. |
| `PATCH /projects/:projectId/members/:userId` | `401` | Phiên truy cập không hợp lệ. |
| `PATCH /projects/:projectId/members/:userId` | `403` | Người gọi không phải `OWNER`. |
| `PATCH /projects/:projectId/members/:userId` | `404` | Project hoặc membership không tồn tại. |
| `PATCH /projects/:projectId/members/:userId` | `409` | Cố thay đổi vai trò của thành viên đang là `OWNER`. |
| `DELETE /projects/:projectId/members/:userId` | `401` | Phiên truy cập không hợp lệ. |
| `DELETE /projects/:projectId/members/:userId` | `403` | Người gọi không phải `OWNER`. |
| `DELETE /projects/:projectId/members/:userId` | `404` | Project hoặc membership không tồn tại. |
| `DELETE /projects/:projectId/members/:userId` | `409` | Chủ dự án đang tự rời khỏi project hoặc cố xóa chính thành viên đang giữ vai trò `OWNER`. |
| `POST /projects/:projectId/transfer-owner` | `400` | Thiếu target hoặc target không hợp lệ. |
| `POST /projects/:projectId/transfer-owner` | `401` | Phiên truy cập không hợp lệ. |
| `POST /projects/:projectId/transfer-owner` | `403` | Người gọi không phải Owner hiện tại. |
| `POST /projects/:projectId/transfer-owner` | `404` | Project không tồn tại hoặc target chưa là thành viên của project. |
| `POST /projects/:projectId/transfer-owner` | `409` | Target là chính Owner hiện tại. |

### 3.3. Công việc và Kanban

| API | Mã | Ý nghĩa cụ thể |
|---|---|---|
| `POST /projects/:projectId/tasks` | `400` | Title/status/priority/position/dueAt/ID không hợp lệ; assignee không thuộc project; sub-task tham chiếu sai. |
| `POST /projects/:projectId/tasks` | `401` | Phiên truy cập không hợp lệ. |
| `POST /projects/:projectId/tasks` | `403` | Người gọi có vai trò `VIEWER` hoặc dự án không cho phép ghi. |
| `POST /projects/:projectId/tasks` | `404` | Project hoặc task cha không tồn tại. |
| `GET /projects/:projectId/tasks` | `401` | Phiên truy cập không hợp lệ. |
| `GET /projects/:projectId/tasks` | `403` | Không thuộc project hoặc `VIEWER` yêu cầu danh sách task đã xóa. |
| `GET /projects/:projectId/tasks/export` | `401` | Phiên truy cập không hợp lệ. |
| `GET /projects/:projectId/tasks/export` | `403` | Người gọi không thuộc project. |
| `GET /projects/:projectId/tasks/:taskId` | `401` | Phiên truy cập không hợp lệ. |
| `GET /projects/:projectId/tasks/:taskId` | `403` | Người gọi không thuộc project. |
| `GET /projects/:projectId/tasks/:taskId` | `404` | Task không tồn tại trong project hoặc đang bị soft-delete. |
| `PATCH /projects/:projectId/tasks/:taskId` | `400` | Không có trường cập nhật; position/status/priority/dueAt/assignee không hợp lệ. |
| `PATCH /projects/:projectId/tasks/:taskId` | `401` | Phiên truy cập không hợp lệ. |
| `PATCH /projects/:projectId/tasks/:taskId` | `403` | Vai trò `VIEWER` hoặc người gọi không thuộc project. |
| `PATCH /projects/:projectId/tasks/:taskId` | `404` | Task không tồn tại trong project hoặc đã bị soft-delete. |
| `DELETE /projects/:projectId/tasks/:taskId` | `401` | Phiên truy cập không hợp lệ. |
| `DELETE /projects/:projectId/tasks/:taskId` | `403` | Vai trò `VIEWER` hoặc người gọi không thuộc project. |
| `DELETE /projects/:projectId/tasks/:taskId` | `404` | Task không tồn tại hoặc đã bị xóa. |
| `POST /projects/:projectId/tasks/:taskId/restore` | `400` | Trạng thái task không cho phép khôi phục theo quy tắc nghiệp vụ. |
| `POST /projects/:projectId/tasks/:taskId/restore` | `401` | Phiên truy cập không hợp lệ. |
| `POST /projects/:projectId/tasks/:taskId/restore` | `403` | Vai trò `VIEWER` hoặc người gọi không thuộc project. |
| `POST /projects/:projectId/tasks/:taskId/restore` | `404` | Task đã xóa hoặc project/task không tồn tại. |
| `POST /projects/:projectId/tasks/:taskId/restore` | `409` | Sub-task đang được khôi phục khi task cha vẫn bị soft-delete. |

### 3.4. Bình luận và tệp đính kèm

| API | Mã | Ý nghĩa cụ thể |
|---|---|---|
| `GET comments` | `401` | Phiên truy cập không hợp lệ. |
| `GET comments` | `403` | Người gọi không thuộc project. |
| `GET comments` | `404` | Task/project không tồn tại. |
| `POST comments` | `400` | Body trống hoặc dài hơn 5.000 ký tự. |
| `POST comments` | `401` | Phiên truy cập không hợp lệ. |
| `POST comments` | `403` | Vai trò `VIEWER` hoặc người gọi không thuộc project. |
| `POST comments` | `404` | Task/project không tồn tại. |
| `PATCH comment` | `400` | Nội dung trống hoặc dài hơn 5.000 ký tự. |
| `PATCH comment` | `401` | Phiên truy cập không hợp lệ. |
| `PATCH comment` | `403` | Không phải tác giả bình luận hoặc không thuộc project. |
| `PATCH comment` | `404` | Comment/task/project không tồn tại. |
| `DELETE comment` | `401` | Phiên truy cập không hợp lệ. |
| `DELETE comment` | `403` | Không phải tác giả bình luận hoặc không phải `OWNER`. |
| `DELETE comment` | `404` | Comment không tồn tại trong task/project. |
| `GET/POST attachments` | `400` | File vượt 10 MiB, kích thước âm, MIME không nằm trong allowlist hoặc metadata không hợp lệ. |
| `GET/POST attachments` | `401` | Phiên truy cập không hợp lệ. |
| `GET/POST attachments` | `403` | Không thuộc project hoặc vai trò không đủ để upload/list theo quy tắc truy cập. |
| `GET/POST attachments` | `404` | Task/project/attachment không tồn tại. |
| `POST attachments/confirm` | `409` | Attachment đã được kích hoạt hoặc object key không hợp lệ/xung đột. |
| `DELETE attachment` | `403` | Người gọi không phải người tải tệp hoặc `OWNER`. |
| `DELETE attachment` | `404` | Attachment không tồn tại trong task/project. |

### 3.5. Thông báo

| API | Mã | Ý nghĩa cụ thể |
|---|---|---|
| `GET /notifications` | `401` | Thiếu/sai access token hoặc phiên không hợp lệ. |
| `GET /notifications` | `400` | `limit` không nằm trong khoảng 1-100 hoặc không phải chuỗi số hợp lệ. |
| `PATCH /notifications/:id/read` | `401` | Phiên truy cập không hợp lệ. |
| `PATCH /notifications/:id/read` | `404` | Notification không tồn tại hoặc không thuộc người dùng hiện tại. |
| `POST /notifications/read-all` | `401` | Phiên truy cập không hợp lệ. |

### 3.6. Health và version

| API | Mã | Ý nghĩa cụ thể |
|---|---|---|
| `GET /health/live` | `200` | Tiến trình API đang chạy. |
| `GET /health/live` | `500` | Kiểm tra liveness gặp lỗi không mong muốn. |
| `GET /health/ready` | `200` | API có thể kết nối PostgreSQL và dependencies readiness khỏe. |
| `GET /health/ready` | `503` | PostgreSQL hoặc dependency readiness không sẵn sàng. |
| `GET /version` | `200` | Trả về Git SHA và build time; không có mã lỗi nghiệp vụ dự kiến. |
