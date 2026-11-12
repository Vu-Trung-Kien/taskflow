# Module Cộng tác: Bình luận & Tệp đính kèm (Collaboration Module)

Tài liệu này đặc tả chi tiết module Cộng tác (`backend/src/collaboration/`) của TaskFlow: trao đổi bình luận trên công việc, quy trình cấp Presigned URL tải tệp đính kèm an toàn qua Amazon S3 / SeaweedFS, kiểm duyệt tệp qua `HeadObject` và ma trận quyền hạn theo vai trò.

---

## 1. Trách nhiệm (Responsibility)

- Quản lý chuỗi thảo luận (comments) trên từng công việc (tối đa 5.000 ký tự cho mỗi bình luận).
- Tự động kích hoạt thông báo in-app `TASK_COMMENT_CREATED` gửi tới người tạo và người đang thực hiện task khi có bình luận mới.
- Quản lý tệp đính kèm an toàn qua dịch vụ lưu trữ S3-compatible:
  - Sinh Presigned PUT URL cho phép trình duyệt tải trực tiếp tệp nhị phân lên S3 bucket riêng tư, giảm tải băng thông và bộ nhớ cho máy chủ API.
  - Kiểm tra tính hợp lệ về dung lượng (tối đa 10 MiB) và định dạng tệp (MIME allowlist).
  - Xác thực thực tế sự tồn tại và kích thước của tệp trên S3 qua lệnh `HeadObject` trước khi kích hoạt bản ghi trong cơ sở dữ liệu.
  - Sinh Presigned GET URL cho phép tải xuống tệp an toàn (thời hạn 5 phút).
  - Xóa tệp đính kèm (xóa bản ghi cơ sở dữ liệu và dọn dẹp object trên S3).

---

## 2. API Công khai & Dịch vụ Xuất bản (Public Interface)

### 2.1. Endpoints Bình luận (Task Comments)
- `GET /projects/:projectId/tasks/:taskId/comments`: Lấy danh sách bình luận (mọi thành viên, kể cả `VIEWER`).
- `POST /projects/:projectId/tasks/:taskId/comments`: Thêm bình luận mới (`CreateCommentDto`: body; chỉ `OWNER` và `MEMBER`).
- `PATCH /projects/:projectId/tasks/:taskId/comments/:commentId`: Chỉnh sửa bình luận (chỉ tác giả của bình luận).
- `DELETE /projects/:projectId/tasks/:taskId/comments/:commentId`: Xóa bình luận (tác giả của bình luận hoặc `OWNER` của dự án).

### 2.2. Endpoints Tệp đính kèm (Task Attachments)
- `GET /projects/:projectId/tasks/:taskId/attachments`: Lấy danh sách tệp đính kèm hợp lệ của task.
- `POST /projects/:projectId/tasks/:taskId/attachments`: Xin cấp Presigned Upload URL (`CreateAttachmentDto`: fileName, contentType, sizeBytes; chỉ `OWNER` và `MEMBER`).
- `POST /projects/:projectId/tasks/:taskId/attachments/confirm`: Xác nhận tải lên thành công qua lệnh S3 `HeadObject` (chỉ `OWNER` và `MEMBER`).
- `GET /projects/:projectId/tasks/:taskId/attachments/:attachmentId/download`: Lấy Presigned Download URL (thời hạn 5 phút).
- `DELETE /projects/:projectId/tasks/:taskId/attachments/:attachmentId`: Xóa tệp đính kèm (người tải lên hoặc `OWNER`).

---

## 3. Phụ thuộc Hai chiều (Dependencies)

- **Phụ thuộc vào (Outgoing Dependencies)**:
  - `ProjectsModule` (`ProjectAccessService`): Kiểm tra quyền truy cập dự án và quyền ghi.
  - `NotificationsModule` (`NotificationService`): Kích hoạt thông báo khi có bình luận mới.
  - `PrismaModule` (`PrismaService`): Thao tác với các bảng `task_comments`, `attachments`, `tasks`.
  - `@nestjs/config` (`ConfigService`): Đọc cấu hình bucket S3 và allowlist MIME type.
  - Thư viện AWS SDK: `@aws-sdk/client-s3` (S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand), `@aws-sdk/s3-request-presigner` (`getSignedUrl`).
  - `AuthModule` (`AccessTokenGuard`): Bảo vệ toàn bộ endpoint.
- **Được phụ thuộc bởi (Incoming Dependencies)**:
  - Không có module nào phụ thuộc trực tiếp vào `CollaborationModule`.

---

## 4. Các File Chính trong Mã nguồn

- `backend/src/collaboration/collaboration.module.ts`: Khai báo module, cung cấp `CollaborationService` và `S3StorageService`.
- `backend/src/collaboration/collaboration.controller.ts`: Tiếp nhận HTTP requests liên quan đến bình luận và tệp đính kèm.
- `backend/src/collaboration/collaboration.service.ts`: Logic nghiệp vụ bình luận, kiểm tra allowlist/size, xử lý xác nhận đính kèm và kích hoạt thông báo.
- `backend/src/collaboration/s3-storage.service.ts`: Tầng giao tiếp trực tiếp với AWS S3 Client và sinh presigned URL.
- `backend/src/collaboration/dto/*.dto.ts`: Bộ DTO kiểm tra dữ liệu đầu vào (`CreateCommentDto`, `CreateAttachmentDto`).

---

## 5. Bẫy Kỹ thuật & Điều Dễ Hiểu Nhầm (Pitfalls & Gotchas)

1. **Ma trận Phân quyền Bình luận**:
   - `VIEWER` có quyền đọc bình luận nhưng không có quyền tạo.
   - Thành viên `MEMBER` chỉ có quyền chỉnh sửa hoặc xóa bình luận do chính mình viết ra (`authorId === userId`).
   - Riêng `OWNER` của dự án có đặc quyền xóa bất kỳ bình luận nào của các thành viên khác để phục vụ kiểm duyệt nội dung.
2. **Quy trình Upload là 3 Bước Tách Biệt**:
   - Bước gọi `POST /attachments` **chưa hề tạo bản ghi đính kèm** trong cơ sở dữ liệu. Nó chỉ sinh ra một signed PUT URL tạm thời và trả về cho trình duyệt.
   - Bản ghi `attachments` chỉ được ghi nhận chính thức khi trình duyệt hoàn thành tải lên S3 và gọi tiếp `POST /attachments/confirm`.
   - Nếu người dùng hủy tải lên hoặc mất mạng giữa chừng, không có bản ghi rác nào bị kích hoạt trong database.
3. **Thời hạn 300 giây (5 phút) của Presigned URL**:
   - Cả URL tải lên (`PutObjectCommand`) và URL tải xuống (`GetObjectCommand`) đều được thiết lập cố định `{ expiresIn: 300 }` (300 giây = 5 phút) trong `backend/src/collaboration/s3-storage.service.ts`. Quá thời gian này, link sẽ tự động hết hiệu lực và S3 sẽ trả về mã lỗi HTTP 403.
4. **Kiểm duyệt Định dạng Tệp theo Allowlist**:
   - Hệ thống không cho phép tải lên định dạng tệp tùy ý. Biến môi trường `S3_ALLOWED_CONTENT_TYPES` quy định danh sách MIME type cho phép (mặc định: `application/pdf`, `image/gif`, `image/jpeg`, `image/png`, `image/webp`, `text/plain`). Mọi loại tệp khác (như `.exe`, `.sh`, `.zip`) sẽ bị từ chối ngay từ bước xin URL.

---

## 6. Kiểm thử Liên quan (Tests)

- **Unit Test Backend**: `backend/src/collaboration/s3-storage.service.spec.ts` (kiểm thử việc cấu hình client S3, sinh signed URL và xử lý lỗi bucket).
- **E2E Test Backend**: `backend/test/collaboration.e2e-spec.ts` (kiểm thử toàn diện luồng thêm/sửa/xóa bình luận, xin presigned URL, xác nhận upload qua mock S3 và phân quyền Owner/Member/Viewer).
