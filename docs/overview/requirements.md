# Yêu cầu sản phẩm TaskFlow

## 1. Mục tiêu và phạm vi

TaskFlow là ứng dụng web quản lý dự án và công việc theo nhóm, đồng thời là
đồ án thực hành chu trình phát triển và vận hành phần mềm trên AWS.

Tài liệu phân biệt rõ chức năng đã có trong MVP với yêu cầu đang nằm trong
lộ trình. Dashboard và xuất CSV đã được triển khai trong mã nguồn. Frontend
đang phục vụ môi trường local; việc triển khai production và xác minh tích hợp
object storage thực tế chưa hoàn tất.

## 2. Chức năng của MVP

### 2.1. Tài khoản và phiên đăng nhập

- Người dùng đăng ký, đăng nhập, xem hồ sơ hiện tại, làm mới phiên và đăng xuất.
- Mật khẩu được băm bằng Argon2id; không lưu mật khẩu dạng rõ.
- Access token là JWT có thời hạn **15 phút**.
- Refresh token là giá trị ngẫu nhiên, chỉ lưu SHA-256 hash trong PostgreSQL
  và được xoay vòng sau mỗi lần sử dụng thành công.
- Mỗi phiên đăng nhập có thời hạn tuyệt đối **30 ngày** kể từ khi tạo; refresh
  không kéo dài thời hạn này. Logout hoặc phát hiện refresh token bị dùng lại
  sẽ thu hồi phiên.
- Email verification chưa bắt buộc trong MVP.

### 2.2. Dự án và thành viên

- Người dùng tạo, xem, sửa, archive và khôi phục dự án.
- Người tạo dự án là Owner. Mỗi dự án có một Owner hiện hành.
- Owner thêm người dùng đã đăng ký, đổi vai trò, xóa thành viên hoặc chuyển
  quyền Owner.
- Mọi thao tác trên dữ liệu dự án phải kiểm tra membership của chính dự án đó
  tại backend.

### 2.3. Công việc

- Owner và Member tạo, xem, cập nhật, xóa mềm và khôi phục task/sub-task;
  Viewer chỉ được xem.
- Mỗi task có thể có tiêu đề, mô tả, người được giao, hạn hoàn thành, trạng
  thái và mức ưu tiên.
- Sub-task được giới hạn tối đa một cấp và phải thuộc cùng dự án với task cha.
- Danh sách hỗ trợ lọc theo trạng thái và mức ưu tiên.
- Archive dự án và soft-delete task không xóa dây chuyền dữ liệu liên quan.

### 2.4. Cộng tác, thống kê và báo cáo

- Thành viên dự án xem bình luận; Owner và Member tạo bình luận. Tác giả có
  thể sửa/xóa bình luận của mình; Owner có thể quản lý bình luận của mọi thành
  viên.
- Owner và Member đính kèm tệp. Tệp được lưu trong object storage riêng tư và
  trao đổi bằng presigned URL; backend xác nhận upload trước khi cho phép tải.
- Dashboard tổng hợp tiến độ task, trạng thái, mức ưu tiên, task quá hạn/sắp
  đến hạn, khối lượng theo thành viên và số lượng bình luận/tệp đính kèm.
- Thành viên dự án có thể xuất danh sách task thành CSV.

### 2.5. Vận hành

- `GET /health/live` kiểm tra tiến trình API.
- `GET /health/ready` kiểm tra khả năng kết nối database.
- `GET /version` trả thông tin phiên bản build.

## 3. Vai trò và quyền truy cập

| Hành động | Owner | Member | Viewer |
|---|---:|---:|---:|
| Xem dự án, task, dashboard và xuất CSV | Có | Có | Có |
| Sửa thông tin dự án | Có | Không | Không |
| Quản lý thành viên và chuyển quyền Owner | Có | Không | Không |
| Tạo, sửa, xóa mềm và khôi phục task/sub-task | Có | Có | Không |
| Xem bình luận | Có | Có | Có |
| Tạo bình luận | Có | Có | Không |
| Sửa/xóa bình luận của mình | Có | Có | Không |
| Quản lý bình luận của thành viên khác | Có | Không | Không |
| Upload/download tệp đính kèm | Có | Có | Không |
| Xóa tệp của mình | Có | Có | Không |
| Xóa tệp của thành viên khác | Có | Không | Không |
| Archive/khôi phục dự án | Có | Không | Không |

## 4. Quy ước dữ liệu và giới hạn

### 4.1. Trạng thái và mức ưu tiên

Các giá trị được dùng thống nhất trong API và database:

| Thuộc tính | Giá trị |
|---|---|
| Trạng thái task | `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED` |
| Mức ưu tiên | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| Vai trò dự án | `OWNER`, `MEMBER`, `VIEWER` |

Trong nội dung mô tả, các vai trò được viết là Owner, Member và Viewer.

### 4.2. Tệp đính kèm

- Kích thước tối đa: **10 MiB** cho mỗi tệp.
- MIME type phải thuộc allowlist cấu hình phía backend.
- Presigned URL upload/download có thời hạn **5 phút**.
- Tệp lưu trong bucket/object storage riêng tư; tên tệp không được dùng làm
  object key.

### 4.3. Thời gian

- Thời điểm lưu trong database theo UTC.
- Quy tắc công việc lặp (khi được triển khai) dùng UTC; ngày không tồn tại
  trong tháng được chuyển về ngày cuối tháng tương ứng.

## 5. Yêu cầu chất lượng và bảo mật

- API nghiệp vụ xác thực người dùng, kiểm tra dữ liệu đầu vào và thực thi quyền
  ở backend.
- Truy vấn đọc/ghi phải giới hạn theo project membership; kiểm thử bao gồm
  truy cập chéo dự án.
- Không ghi mật khẩu, token hoặc credential vào log.
- Mọi thay đổi schema đi qua Prisma migration và được kiểm thử trước khi phát
  hành.
- CI duy trì lint, typecheck, unit test, e2e test, build image và quét image.
- Liveness và readiness là hai kiểm tra riêng biệt.
- Không công khai API cho người dùng cuối trước khi có reverse proxy/HTTPS và
  quy trình vận hành backup/restore, monitoring phù hợp.

## 6. Hạng mục ngoài MVP

Các yêu cầu sau chưa được triển khai:

- Thông báo trong ứng dụng và gửi email. MailHog chỉ phục vụ môi trường local;
  email production dự kiến dùng AWS SES.
- Công việc lặp theo ngày, tuần hoặc tháng.
- Feature flags có thể cập nhật runtime; feature flag không thay thế cơ chế
  authorization.
- Xác minh email và quy trình quên/đặt lại mật khẩu.
- Frontend production, domain/HTTPS công khai, backup/restore đã diễn tập,
  monitoring/cảnh báo và kiểm thử tải.

## 7. Tài liệu liên quan

- [Chức năng và luồng nghiệp vụ](product-overview.md)
- [Thiết kế kỹ thuật](../architecture/system-design.md)
- [Thiết kế cơ sở dữ liệu](../architecture/database.md)
- [Trạng thái hệ thống](../STATE.md)
- [Báo cáo tiến độ & lộ trình](../project/progress.md)
