# Module Thông báo Trong ứng dụng (Notifications Module)

Tài liệu này đặc tả chi tiết module Thông báo (`backend/src/notifications/`) của TaskFlow: kiến trúc kích hoạt sự kiện in-app, API truy vấn và quản lý trạng thái đọc, giao diện chuông thông báo trên frontend và các điểm lưu ý kỹ thuật.

---

## 1. Trách nhiệm (Responsibility)

- Lưu trữ và quản lý toàn bộ thông báo trong ứng dụng cho người dùng trong bảng `notifications`.
- Tiếp nhận yêu cầu tạo thông báo từ các module nghiệp vụ khác (`tasks`, `collaboration`) thông qua hàm dịch vụ `createNotification`.
- Tự động lọc bỏ các thông báo tự gửi cho chính mình (`actorId === userId`).
- Cung cấp API trả về danh sách thông báo mới nhất kèm số lượng thông báo chưa đọc (`unreadCount`).
- Cung cấp thao tác đánh dấu đã đọc từng thông báo hoặc đánh dấu đã đọc toàn bộ cho người dùng.

---

## 2. API Công khai & Dịch vụ Xuất bản (Public Interface)

### 2.1. Endpoints HTTP (Yêu cầu xác thực Bearer JWT)
- `GET /notifications?limit=50`: Lấy danh sách thông báo của người dùng hiện tại (sắp xếp giảm dần theo thời gian tạo, mặc định 50 bản ghi, tối đa 100) kèm số lượng tin chưa đọc `unreadCount`.
- `PATCH /notifications/:id/read`: Đánh dấu một thông báo cụ thể là đã đọc (`is_read = true`, `read_at = now()`).
- `POST /notifications/read-all`: Đánh dấu toàn bộ thông báo chưa đọc của người dùng là đã đọc.

### 2.2. Dịch vụ Xuất bản (Exported Providers)
- `NotificationService`: Cung cấp phương thức `createNotification({ userId, actorId, type, title, message, data })` cho các service khác gọi trực tiếp khi phát sinh sự kiện.

---

## 3. Phụ thuộc Hai chiều (Dependencies)

- **Phụ thuộc vào (Outgoing Dependencies)**:
  - `PrismaModule` (`PrismaService`): Thao tác với bảng `notifications` và liên kết với `users`.
  - `AuthModule` (`AccessTokenGuard`): Bảo vệ toàn bộ endpoint trong `NotificationController`.
- **Được phụ thuộc bởi (Incoming Dependencies)**:
  - `TasksModule`: Tiêm `NotificationService` để gửi thông báo khi tạo/gán task (`TASK_ASSIGNED`) và khi đổi trạng thái task (`TASK_STATUS_CHANGED`).
  - `CollaborationModule`: Tiêm `NotificationService` để gửi thông báo khi có bình luận mới (`TASK_COMMENT_CREATED`).
- **Tính độc lập cao**: Module không phụ thuộc vào `ProjectsModule` hay `TasksModule`, giúp ngăn chặn phụ thuộc vòng.

---

## 4. Các File Chính trong Mã nguồn

- `backend/src/notifications/notifications.module.ts`: Khai báo module, cung cấp và xuất bản `NotificationService`.
- `backend/src/notifications/notification.controller.ts`: Tiếp nhận HTTP requests, kiểm tra guard xác thực và xử lý phân trang query.
- `backend/src/notifications/notification.service.ts`: Logic truy vấn, đếm unreadCount, đánh dấu đã đọc và khởi tạo thông báo.
- `frontend/src/App.tsx`: Chứa component chuông thông báo (Notification bell badge & dropdown menu).

---

## 5. Bẫy Kỹ thuật & Điều Dễ Hiểu Nhầm (Pitfalls & Gotchas)

1. **Cơ chế Polling / Request-driven (Chưa có Real-time Push)**:
   - Hệ thống thông báo hiện tại hoạt động theo mô hình REST API. Frontend gọi `GET /notifications` khi người dùng tải trang hoặc click vào biểu tượng chuông.
   - Chưa có kết nối WebSocket Gateway hay Server-Sent Events (SSE) để đẩy thông báo thời gian thực ngay khi sự kiện phát sinh.
2. **Tự động Bỏ qua Hành động của Chính Mình**:
   - Trong `NotificationService.createNotification`, hệ thống kiểm tra: nếu `actorId && userId === actorId`, service lập tức trả về `null` và không tạo bản ghi nào. Ví dụ: khi bạn tự tạo task và tự gán cho mình, hoặc tự bình luận vào task của mình, hệ thống sẽ không sinh thông báo rác gửi lại cho chính bạn.
3. **Enum `TASK_DUE_SOON` Chưa Có Tiến trình Quét**:
   - Enum `TASK_DUE_SOON` đã tồn tại trong database migration `backend/prisma/migrations/20261101000000_notifications/`. Tuy nhiên, trong mã nguồn hiện tại **chưa có scheduler/worker nào quét định kỳ** các task sắp đến hạn để gọi tạo thông báo này (hướng xử lý dự kiến là cron job nội bộ `@nestjs/schedule`, xem [`docs/project/roadmap.md`](../project/roadmap.md)).

---

## 6. Kiểm thử Liên quan (Tests)

- **Unit Test Controller**: `backend/src/notifications/notification.controller.spec.ts` (kiểm thử các endpoint danh sách, đánh dấu đọc 1 tin và đánh dấu đọc tất cả).
- **Unit Test Service**: `backend/src/notifications/notification.service.spec.ts` (kiểm thử logic `list`, `markAsRead`, `markAllAsRead`, `createNotification` và kiểm tra logic bỏ qua actor trùng recipient).
