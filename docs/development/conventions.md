# Quy ước Lập trình & Checklist Phát triển (Conventions & Checklists)

Tài liệu này quy định các chuẩn mực viết mã, nguyên tắc phân tầng kiến trúc, quy trình từng bước khi bổ sung tính năng mới và danh sách kiểm tra (checklist) bắt buộc đối với Pull Request có migration cơ sở dữ liệu theo mô hình Expand/Contract.

---

## 1. Quy ước Viết Mã (Coding Conventions)

### 1.1. TypeScript & NestJS Backend
- **Chế độ kiểm tra nghiêm ngặt (Strict TypeScript)**:
  - Tuyệt đối không sử dụng kiểu `any`. Sử dụng kiểu dữ liệu sinh tự động từ Prisma Client (`backend/src/generated/prisma`).
  - Mọi hàm trong service và controller phải khai báo rõ ràng kiểu trả về (`Promise<T>`, `Promise<void>`).
- **Xác thực Dữ liệu Đầu vào (DTO & Validation)**:
  - Mọi dữ liệu từ body của HTTP request phải đi qua DTO được xác thực bằng `class-validator` và `class-transformer`.
  - Mọi tham số định danh trên URL phải được bọc qua `ParseUUIDPipe`.
  - Các chuỗi văn bản nhận từ người dùng phải được cắt khoảng trắng thừa qua `@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)`.
- **Nguyên tắc Phân quyền RBAC**:
  - Mọi endpoint có tham số `:projectId` bắt buộc phải kiểm tra quyền sở hữu hoặc thành viên thông qua `ProjectAccessService.requireMembership(projectId, userId)` hoặc `ProjectAccessService.requireRole(projectId, userId, [OWNER, MEMBER])`.
  - Tuyệt đối không chỉ dựa vào việc ẩn nút bấm trên giao diện frontend để bảo vệ tài nguyên.
- **Bảo vệ Thông tin Nhạy cảm**:
  - Không ghi log chứa access token, refresh token, mật khẩu hoặc connection string.
  - Mật khẩu bắt buộc băm bằng Argon2id. Refresh token chỉ lưu dưới dạng SHA-256 hash 64 ký tự.

### 1.2. Frontend React
- **Quản lý Trạng thái & Tương tác**:
  - Áp dụng kỹ thuật cập nhật lạc quan (Optimistic Update) cho các thao tác trực quan như kéo-thả Kanban, đổi trạng thái task, kèm cơ chế rollback state về trạng thái cũ nếu API trả về lỗi.
  - Quản lý JWT Access Token hoàn toàn trong bộ nhớ (`AuthContext`), không lưu vào `localStorage` hay `sessionStorage` để phòng tránh tấn công XSS.

---

## 2. Checklist Khi Bổ sung Tính năng Mới (Feature Checklist)

Khi phát triển một tính năng nghiệp vụ mới, lập trình viên cần tuân thủ tuần tự các bước sau:

- [ ] **1. Cơ sở dữ liệu (Nếu có thay đổi schema)**:
  - [ ] Khai báo model/field trong `backend/prisma/schema.prisma`.
  - [ ] Chạy `npm run db:migrate:dev --name <ten_tinh_nang>` để sinh migration.
  - [ ] Chạy `npm run db:generate` để cập nhật Prisma Client.
- [ ] **2. DTO & Validation**:
  - [ ] Tạo file DTO tương ứng trong thư mục `dto/` của module.
  - [ ] Gắn các decorator kiểm tra kiểu, độ dài tối đa, định dạng hợp lệ.
- [ ] **3. Nghiệp vụ tại Service**:
  - [ ] Triển khai hàm nghiệp vụ trong service tương ứng.
  - [ ] Kiểm tra quyền truy cập thông qua `ProjectAccessService`.
  - [ ] Áp dụng `prisma.$transaction` nếu thao tác ghi ảnh hưởng tới nhiều bảng.
  - [ ] Kích hoạt thông báo qua `NotificationService.createNotification` nếu phát sinh sự kiện quan trọng.
- [ ] **4. Routing & Controller**:
  - [ ] Gắn decorator route HTTP (`@Post`, `@Get`, `@Patch`, `@Delete`).
  - [ ] Đặt `@UseGuards(AccessTokenGuard)` trên controller hoặc endpoint nghiệp vụ.
  - [ ] Sử dụng `@Req() request: AuthenticatedRequest` để lấy `request.user.id`.
- [ ] **5. Kiểm thử Tự động**:
  - [ ] Viết unit test cho service và controller tương ứng (`*.spec.ts`).
  - [ ] Viết hoặc bổ sung kịch bản kiểm thử tích hợp đầu cuối trong `backend/test/`.
  - [ ] Chạy `npm run lint`, `npm run typecheck` và `npm test` thành công không có lỗi.
- [ ] **6. Giao diện Frontend**:
  - [ ] Khai báo hàm gọi API mới trong `frontend/src/api.ts` kèm kiểu dữ liệu trong `frontend/src/types.ts`.
  - [ ] Tích hợp giao diện người dùng, xử lý trạng thái loading, trạng thái thành công và hiển thị lỗi.

---

## 3. Checklist Pull Request Có Migration (Mô hình Expand / Contract)

Do hệ thống triển khai theo quy trình CD không dừng hệ thống (rolling/re-create container), việc thay đổi cơ sở dữ liệu phải tuyệt đối tuân thủ mô hình **Expand / Contract** (Mở rộng trước, Thu hẹp sau) để đảm bảo phiên bản container API cũ vẫn hoạt động bình thường trong thời gian migration đang diễn ra.

### 3.1. Giai đoạn 1: Mở rộng (Expand Phase)
- [ ] Cột mới thêm vào bắt buộc phải là `NULLABLE` hoặc có giá trị mặc định (`DEFAULT`).
- [ ] Tuyệt đối **không thêm cột `NOT NULL`** mà không có giá trị default trên bảng đã có dữ liệu.
- [ ] Bổ sung bảng mới, enum mới hoặc index mới không ảnh hưởng tới các câu truy vấn hiện hành.
- [ ] Không đổi tên cột (Rename column) trực tiếp trong một migration; thay vào đó thêm cột mới và đồng bộ dữ liệu song song.

### 3.2. Giai đoạn 2: Thu hẹp (Contract Phase - Thực hiện ở Release sau)
- [ ] Chỉ xóa cột cũ hoặc bảng cũ sau khi toàn bộ code ở phiên bản release trước đã hoàn toàn ngừng sử dụng cột đó.
- [ ] Đã kiểm tra không có khóa ngoại (Foreign Key) nào đang tham chiếu tới dữ liệu chuẩn bị xóa mà thiếu cascade rule phù hợp.

### 3.3. Quy tắc Nghiêm cấm Tuyệt đối
- [ ] **Không chỉnh sửa nội dung** các file migration đã merge vào nhánh `main`.
- [ ] **Không dùng lệnh `prisma migrate reset`** trên môi trường có dữ liệu thật.
- [ ] File migration phải được kiểm tra cú pháp SQL trước khi mở PR.
