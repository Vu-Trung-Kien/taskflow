# Tổng quan Sản phẩm TaskFlow (Product Overview)

Tài liệu này mô tả bức tranh tổng thể của sản phẩm TaskFlow, mục tiêu xây dựng, các nhóm người dùng, tính năng cốt lõi và luồng nghiệp vụ chính của hệ thống. Nội dung được rà soát và đối chiếu trực tiếp từ mã nguồn thực tế tại `backend/src/` và `frontend/src/`.

---

## 1. Mục tiêu và Định vị Sản phẩm

**TaskFlow** là ứng dụng web quản lý dự án và công việc theo nhóm, hướng tới tính tinh gọn, an toàn và dễ sử dụng. Đồng thời, dự án là mô hình mẫu chuẩn mực để thực hành toàn diện quy trình DevOps hiện đại: từ quản lý mã nguồn, kiểm thử tự động, đóng gói container, quản lý hạ tầng bằng mã (IaC Terraform) đến phát hành liên tục lên nền tảng đám mây AWS.

Hệ thống được thiết kế theo kiến trúc phân tách rõ ràng giữa Frontend Single Page Application (React 19, TypeScript, Vite) và Backend RESTful API (NestJS 12, Prisma 7, PostgreSQL 16), tích hợp lưu trữ tệp đính kèm qua S3 API.

---

## 2. Đối tượng Người dùng & Mô hình Phân quyền (Personas & RBAC)

Quyền hạn của người dùng trong hệ thống gắn liền với từng dự án cụ thể (`project_members`), bao gồm 3 vai trò:

| Vai trò | Trách nhiệm chính | Quyền hạn trên dữ liệu dự án |
|---|---|---|
| **Owner** *(Chủ dự án)* | Người khởi tạo hoặc người tiếp nhận quyền quản trị dự án. | - Toàn quyền cấu hình dự án, lưu trữ (archive) và khôi phục (restore) dự án.<br>- Thêm/xóa thành viên, điều chỉnh vai trò và chuyển quyền sở hữu (`OWNER`).<br>- Quản lý toàn bộ task, sub-task, bình luận và tệp đính kèm của mọi thành viên. |
| **Member** *(Thành viên)* | Người tham gia trực tiếp thực thi và cộng tác trong dự án. | - Xem thông tin dự án, danh sách thành viên, dashboard và xuất CSV.<br>- Tạo mới, chỉnh sửa, đổi trạng thái trên Kanban, xóa mềm và khôi phục công việc.<br>- Viết bình luận, tải lên/tải xuống tệp đính kèm; sửa/xóa bình luận và tệp của chính mình. |
| **Viewer** *(Người quan sát)* | Khách hàng, đối tác hoặc người theo dõi tiến độ. | - Chỉ có quyền đọc (Read-only): Xem dự án, danh sách task, bảng Kanban, bình luận, tệp đính kèm, dashboard metrics và xuất báo cáo CSV.<br>- Không được thực hiện bất kỳ thao tác thay đổi dữ liệu nào. |

---

## 3. Các Nhóm Tính năng Cốt lõi

### 3.1. Xác thực & Quản lý Phiên làm việc (Auth & Session)
- **Đăng ký & Đăng nhập**: Xác thực bằng email (chuẩn hóa chữ thường) và mật khẩu; mật khẩu được mã hóa an toàn bằng thuật toán **Argon2id** trước khi lưu vào cơ sở dữ liệu (`backend/src/auth/auth.service.ts`).
- **Access Token ngắn hạn**: Cấp JWT Access Token có thời hạn **15 phút**, lưu trong bộ nhớ client để xác thực các request API.
- **Refresh Token xoay vòng an toàn**:
  - Lưu trong cookie `HttpOnly`, `SameSite=Lax` (bật `Secure` ở production).
  - Database chỉ lưu **SHA-256 hash** của token (`backend/prisma/schema.prisma`).
  - Xoay vòng (rotate) refresh token mới sau mỗi lần làm mới thành công.
  - Cơ chế phát hiện tấn công phát lại (Replay Detection): Nếu phát hiện một token đã thu hồi hoặc token cũ bị dùng lại, toàn bộ phiên đăng nhập (`auth_sessions`) bị hủy ngay lập tức.
  - Giới hạn tuyệt đối của phiên là **30 ngày** kể từ lúc tạo, việc refresh không kéo dài mốc thời gian này.

### 3.2. Quản lý Dự án & Thành viên (Projects & Membership)
- **Vòng đời dự án**: Khởi tạo dự án mới, cập nhật tên và mô tả.
- **Lưu trữ & Khôi phục**: Hỗ trợ lưu trữ dự án (`archivedAt`), đưa dự án về trạng thái chỉ đọc và có thể khôi phục khi cần thiết.
- **Quản lý nhóm**: Thêm thành viên theo địa chỉ email đã có tài khoản, phân vai trò (`OWNER`, `MEMBER`, `VIEWER`), xóa thành viên hoặc chuyển quyền Owner sang thành viên khác.

### 3.3. Quản lý Công việc, Sub-task & Bảng kéo-thả Kanban
- **CRUD Công việc**: Tạo và quản lý task với tiêu đề, mô tả chi tiết, người được giao (`assigneeId`), hạn hoàn thành (`dueAt`), trạng thái (`status`) và mức độ ưu tiên (`priority`).
- **Trạng thái & Ưu tiên**:
  - Trạng thái công việc: `TODO` (Cần làm), `IN_PROGRESS` (Đang làm), `DONE` (Hoàn tất), `BLOCKED` (Bị chặn).
  - Mức độ ưu tiên: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- **Công việc con (Sub-task)**: Hỗ trợ phân rã công việc con tối đa 1 cấp (`parentTaskId`), bắt buộc thuộc cùng dự án với task cha.
- **Bảng kéo-thả trực quan Kanban Board**:
  - Giao diện trực quan chia thành 4 cột tương ứng 4 trạng thái công việc (`frontend/src/App.tsx`).
  - Hỗ trợ thao tác kéo-thả (HTML5 Drag & Drop) mượt mà để thay đổi trạng thái công việc tức thì với phản hồi optimistic UI.
  - Hiển thị đầy đủ thẻ ưu tiên, hạn chót, tiến độ sub-task và avatar người thực hiện trên từng card.
- **Xóa mềm & Khôi phục**: Thao tác xóa task chỉ cập nhật mốc thời gian `deletedAt`, cho phép Owner/Member dễ dàng lọc và khôi phục khi cần.

### 3.4. Cộng tác: Bình luận & Tệp đính kèm (Collaboration)
- **Bình luận công việc**: Trao đổi chi tiết trên từng task (tối đa 5.000 ký tự); phân quyền sửa/xóa theo tác giả hoặc Owner.
- **Tệp đính kèm qua S3 Presigned URL**:
  - Tải tệp trực tiếp và an toàn giữa trình duyệt và S3 Storage (`backend/src/collaboration/s3-storage.service.ts`).
  - Giới hạn dung lượng tối đa **10 MiB** cho mỗi tệp.
  - Kiểm tra định dạng theo allowlist cấu hình: `application/pdf`, `image/gif`, `image/jpeg`, `image/png`, `image/webp`, `text/plain`.
  - Presigned URL tải lên/tải xuống có thời hạn ngắn **5 phút**.
  - Xác thực thực tế sự tồn tại và kích thước của tệp qua lệnh S3 `HeadObject` trước khi kích hoạt bản ghi đính kèm trong database.

### 3.5. Hệ thống Thông báo trong ứng dụng (In-app Notifications)
- **Kích hoạt tự động theo sự kiện nghiệp vụ**:
  - `TASK_ASSIGNED`: Gửi thông báo khi người dùng được phân công vào công việc mới hoặc được đổi sang làm người thực hiện.
  - `TASK_STATUS_CHANGED`: Gửi thông báo tới người tạo task và người thực hiện khi trạng thái task thay đổi.
  - `TASK_COMMENT_CREATED`: Gửi thông báo tới người tạo task và người thực hiện khi có bình luận mới được thêm vào.
- **Trải nghiệm trên giao diện**: Biểu tượng chuông trên thanh điều hướng với huy hiệu đếm số lượng chưa đọc, danh sách dropdown hiển thị thời gian, người gửi và hỗ trợ thao tác "Đánh dấu đã đọc" từng tin hoặc "Đánh dấu tất cả là đã đọc" (`frontend/src/App.tsx`).

### 3.6. Báo cáo & Thống kê (Metrics & CSV Export)
- **Dashboard Thống kê thời gian thực**: Cung cấp các thẻ chỉ số tổng quan, tỷ lệ phần trăm hoàn thành, biểu đồ phân bố trạng thái/mức ưu tiên, số lượng task quá hạn/sắp đến hạn và bảng phân bổ khối lượng công việc theo từng thành viên (`backend/src/projects/project.controller.ts`).
- **Xuất Báo cáo CSV**: Cho phép trích xuất toàn bộ danh sách công việc của dự án thành file `.csv` chuẩn RFC 4180 kèm UTF-8 BOM (`\uFEFF`) để hiển thị chuẩn xác tiếng Việt trên Microsoft Excel và các ứng dụng bảng tính.

---

## 4. Các Luồng Nghiệp vụ Chính (Business Workflows)

### 4.1. Luồng Bắt đầu & Gia nhập Dự án
1. Người dùng mới thực hiện đăng ký tài khoản qua `POST /auth/register` hoặc đăng nhập qua `POST /auth/login`.
2. Trình duyệt nhận JWT access token trong response body và cookie `refresh_token` tự động lưu bởi browser.
3. Người dùng truy cập danh sách dự án. Nếu là người mới, có thể tạo dự án mới và tự động trở thành `OWNER`. Nếu đã được mời, danh sách hiển thị các dự án được tham gia.

### 4.2. Luồng Thiết lập Nhóm & Phân quyền
1. Chủ sở hữu dự án (`OWNER`) mở tab "Thành viên" và nhập email người cần mời.
2. Hệ thống kiểm tra tài khoản tồn tại trong bảng `users` và tạo bản ghi `project_members` với vai trò được chọn (`MEMBER` hoặc `VIEWER`).
3. Khi cần bàn giao quản lý, Owner chọn chức năng chuyển quyền; hệ thống thực hiện transaction hoán đổi: người nhận thành `OWNER`, Owner cũ chuyển về `MEMBER`.

### 4.3. Luồng Quản lý Công việc trên Bảng Kanban
1. Thành viên chọn chế độ xem "Bảng kéo-thả" (Kanban) trên màn hình dự án.
2. Người dùng kéo thẻ công việc từ cột "Cần làm" (`TODO`) thả vào cột "Đang làm" (`IN_PROGRESS`) hoặc "Hoàn tất" (`DONE`).
3. Giao diện cập nhật vị trí thẻ ngay lập tức (optimistic update), đồng thời gửi request `PATCH /projects/:projectId/tasks/:taskId` cập nhật trạng thái ở backend.
4. Backend kiểm tra quyền ghi của người dùng, cập nhật database và tự động phát sinh thông báo sự kiện `TASK_STATUS_CHANGED` gửi cho người tạo và người phụ trách task.

### 4.4. Luồng Tải lên Tệp đính kèm an toàn
1. Người dùng chọn tệp cần đính kèm trên giao diện chi tiết task.
2. Trình duyệt gửi thông tin metadata (tên tệp, mime type, kích thước) qua API `POST /projects/:projectId/tasks/:taskId/attachments`.
3. Backend kiểm tra kích thước (≤ 10 MiB) và định dạng tệp thuộc allowlist; sau đó sinh presigned PUT URL có thời hạn 5 phút từ S3 API.
4. Trình duyệt tải trực tiếp nội dung tệp lên S3 thông qua presigned URL.
5. Sau khi tải xong, trình duyệt gọi API `POST /projects/:projectId/tasks/:taskId/attachments/confirm`. Backend thực hiện lệnh `HeadObject` tới S3 để kiểm chứng tệp tồn tại thực tế, sau đó lưu bản ghi `Attachment` hoàn chỉnh vào database.

---

## 5. Hiện trạng & Lộ trình Tính năng

| Nhóm tính năng / Hạng mục | Trạng thái hiện tại | Ghi chú kỹ thuật |
|---|---|---|
| Xác thực Argon2id, JWT 15m, Refresh Token xoay vòng 30 ngày | **[ĐÃ CÓ]** | Hoàn tất ở Backend, Frontend và EC2 Production. |
| CRUD Dự án, RBAC Owner/Member/Viewer, Chuyển quyền | **[ĐÃ CÓ]** | Hoàn tất ở Backend, Frontend và EC2 Production. |
| CRUD Task/Sub-task 1 cấp, Soft-delete/Restore | **[ĐÃ CÓ]** | Hoàn tất ở Backend, Frontend và EC2 Production. |
| Bảng kéo-thả trực quan Kanban Board | **[ĐÃ CÓ]** | Hoàn tất mã nguồn ở Frontend React và Backend API. |
| Bình luận công việc & Upload tệp qua S3 Presigned URL | **[ĐÃ CÓ]** | Hoàn tất mã nguồn Backend & Frontend; local chạy SeaweedFS. |
| Hệ thống Thông báo In-app (API & Giao diện chuông) | **[ĐÃ CÓ]** | Hoàn tất mã nguồn Backend & Frontend; kích hoạt theo 3 sự kiện. |
| Dashboard Thống kê thời gian thực & Xuất báo cáo CSV | **[ĐÃ CÓ]** | Hoàn tất mã nguồn Backend & Frontend. |
| Tích hợp lưu trữ thực tế trên AWS S3 Production | **[CHƯA KIỂM CHỨNG]** | Bucket AWS S3 đã tạo bằng Terraform; cần kiểm thử end-to-end qua app với domain/CORS sau release đầu tiên. |
| Triển khai Frontend Production bằng Caddy trên EC2 | **[CHƯA LÀM]** | Phương án đã duyệt (ADR-001); chưa cấu hình Dockerfile/Caddyfile. |
| Tự động hóa Domain & Chứng chỉ HTTPS công khai | **[CHƯA LÀM]** | Chưa cấu hình domain trỏ về EC2 và Let's Encrypt qua Caddy. |
| Dịch vụ Gửi Thư Điện tử (MailHog / AWS SES) | **[CHƯA LÀM]** | Container MailHog có trong `compose.yaml`; Backend chưa có `MailModule`. |
| Công việc lặp định kỳ (Recurring Tasks) | **[CHƯA LÀM]** | Chưa có schema và scheduler cho task lặp. |
| Quản lý Cờ tính năng (Feature Flags) | **[CHƯA LÀM]** | Chưa có module feature flag tại runtime. |
| Tự động sao lưu PostgreSQL lên S3 & Kịch bản diễn tập DR | **[CHƯA LÀM]** | Bucket backup đã tạo; chưa có cron job `pg_dump` và diễn tập khôi phục. |
| Giám sát hệ thống (Prometheus / CloudWatch Alarms) | **[CHƯA LÀM]** | Chưa có endpoint `/metrics` và cảnh báo tự động. |
| Giới hạn tần suất gọi API (Rate Limiting) | **[CHƯA LÀM]** | Chưa cài đặt `@nestjs/throttler`. |

---

## 6. Tài liệu Liên quan

- [Mục lục Tài liệu](../README.md)
- [Trạng thái Hệ thống](../STATE.md)
- [Yêu cầu Hệ thống](requirements.md)
- [Thiết kế Kiến trúc Kỹ thuật](../architecture/system-design.md)
- [Thiết kế Cơ sở Dữ liệu](../architecture/database.md)
- [Quyết định Kiến trúc (ADR)](../architecture/decisions.md)
- [Vấn đề Tồn đọng & Điểm lệch Kỹ thuật](../project/known-issues.md)
- [Lộ trình Phát triển](../project/roadmap.md)
- [Báo cáo Tiến độ Phát triển](../project/progress.md)
