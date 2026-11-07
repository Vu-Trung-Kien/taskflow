# Chức năng chính và luồng nghiệp vụ

TaskFlow là ứng dụng web giúp cá nhân và nhóm tổ chức dự án, phân công công việc
và theo dõi tiến độ. Tài liệu này mô tả các chức năng hiện có trong MVP; những
hạng mục chưa triển khai được ghi riêng ở cuối tài liệu.

## Chức năng chính

### Tài khoản và phiên làm việc

- Người dùng đăng ký bằng tên, email và mật khẩu hoặc đăng nhập bằng tài khoản
  hiện có.
- Mật khẩu được băm bằng Argon2id trước khi lưu. Sau khi xác thực, ứng dụng cấp
  access JWT có thời hạn 15 phút và đặt refresh token trong cookie HttpOnly.
- Refresh token được xoay vòng sau mỗi lần sử dụng thành công; mỗi phiên đăng
  nhập có giới hạn tuyệt đối 30 ngày kể từ lúc tạo. Refresh không gia hạn giới
  hạn này.
- Người dùng có thể đăng xuất; phiên bị thu hồi và không thể tiếp tục sử dụng.

### Dự án và thành viên

- Tạo, xem và cập nhật thông tin dự án; người tạo dự án trở thành Owner.
- Mời người dùng đã có tài khoản tham gia dự án, đổi vai trò hoặc xóa thành
  viên. Owner có thể chuyển quyền sở hữu cho thành viên khác.
- Archive dự án để đưa khỏi danh sách đang hoạt động và khôi phục khi cần.
- Ba vai trò trong dự án:

| Quyền | Owner | Member | Viewer |
|---|---:|---:|---:|
| Xem dự án, công việc, dashboard và xuất CSV | Có | Có | Có |
| Sửa thông tin dự án, quản lý thành viên, chuyển quyền Owner | Có | Không | Không |
| Tạo, sửa, xóa và khôi phục công việc | Có | Có | Không |
| Bình luận và đính kèm tệp | Có | Có | Không |

### Công việc và công việc con

- Tạo và cập nhật công việc với mô tả, người được giao, hạn hoàn thành, trạng
  thái và mức ưu tiên.
- Trạng thái task gồm `TODO`, `IN_PROGRESS`, `DONE` và `BLOCKED`; mức ưu tiên
  gồm `LOW`, `MEDIUM`, `HIGH` và `URGENT`.
- Tạo công việc con tối đa một cấp; công việc con thuộc cùng dự án với công
  việc cha.
- Lọc danh sách theo trạng thái và mức ưu tiên. Công việc đã xóa mềm có thể
  được xem và khôi phục bởi Owner hoặc Member.
- Xóa công việc là xóa mềm, không xóa vĩnh viễn dữ liệu cộng tác gắn với nó.

### Cộng tác trên công việc

- Thành viên dự án xem bình luận; Owner và Member có thể tạo bình luận. Tác giả
  quản lý bình luận của mình, còn Owner có thể quản lý bình luận của thành viên.
- Owner và Member có thể đính kèm tệp. Nội dung tệp được truyền trực tiếp giữa
  trình duyệt và kho S3-compatible bằng presigned URL; backend kiểm tra metadata
  và xác nhận tệp đã được tải lên.
- Tệp tối đa 10 MiB, MIME type phải thuộc allowlist cấu hình và presigned URL
  có thời hạn 5 phút. Owner/Member quản lý tệp của mình; Owner có thể xóa tệp
  của thành viên khác.

### Theo dõi và báo cáo

- Dashboard tổng hợp số lượng và tỷ lệ hoàn thành công việc, phân bố trạng
  thái/mức ưu tiên, công việc quá hạn hoặc sắp đến hạn, khối lượng theo thành
  viên và hoạt động bình luận/tệp đính kèm.
- Thành viên dự án có thể xuất danh sách công việc ra CSV để lưu hoặc xử lý
  bên ngoài.

## Luồng nghiệp vụ

### 1. Bắt đầu sử dụng

1. Người dùng đăng ký hoặc đăng nhập.
2. Ứng dụng thiết lập phiên làm việc và mở danh sách dự án.
3. Nếu chưa có dự án, người dùng tạo dự án mới và trở thành Owner; nếu đã được
   mời vào dự án, người dùng chọn dự án cần làm việc.

### 2. Thiết lập nhóm dự án

1. Owner thêm thành viên theo email của tài khoản đã đăng ký.
2. Owner gán vai trò Member để cho phép cập nhật công việc, hoặc Viewer để chỉ
   cho phép xem.
3. Khi trách nhiệm quản lý thay đổi, Owner có thể đổi vai trò, xóa thành viên
   hoặc chuyển quyền Owner.
4. Thành viên chỉ truy cập dữ liệu của các dự án mà họ là thành viên; quyền
   ghi được kiểm tra ở backend theo vai trò.

### 3. Lập kế hoạch và cập nhật công việc

1. Owner hoặc Member tạo công việc, điền thông tin cần thiết và có thể giao
   công việc cho một thành viên trong cùng dự án.
2. Nhóm bổ sung công việc con nếu cần chia nhỏ đầu việc.
3. Trong quá trình thực hiện, Owner/Member cập nhật trạng thái, mức ưu tiên,
   hạn hoặc người được giao; Viewer theo dõi tiến độ nhưng không chỉnh sửa.
4. Công việc không còn hoạt động được xóa mềm và có thể khôi phục. Dự án đã
   archive cũng có thể được khôi phục bởi Owner.

### 4. Trao đổi và chia sẻ tệp

1. Thành viên mở một công việc để xem nội dung trao đổi.
2. Owner/Member viết bình luận hoặc chọn tệp đính kèm.
3. Khi tải tệp, trình duyệt yêu cầu backend cấp URL upload; trình duyệt tải
   trực tiếp lên object storage rồi báo backend xác nhận.
4. Owner/Member được cấp URL download tạm thời để tải tệp. Quyền xem, sửa và
   xóa vẫn tuân theo vai trò, tác giả và quyền Owner.

### 5. Theo dõi tiến độ và xuất dữ liệu

1. Thành viên mở dashboard của dự án để xem tiến độ tổng hợp và khối lượng
   công việc theo thành viên.
2. Có thể chọn chỉ số trạng thái/ưu tiên để lọc nhanh danh sách công việc.
3. Thành viên xuất CSV từ danh sách công việc hoặc dashboard để sử dụng ngoài
   ứng dụng.

## Phạm vi chưa triển khai

Các yêu cầu sau chưa có trong MVP: thông báo trong ứng dụng/email, công việc
lặp định kỳ và feature flags. Frontend hiện chạy local; frontend production,
HTTPS/domain, quy trình backup/restore đã diễn tập và monitoring/cảnh báo cũng
còn là các hạng mục cần hoàn thiện. Tệp đính kèm được triển khai qua API và
giao diện, nhưng tích hợp lưu trữ thực tế cần được xác minh riêng trên
SeaweedFS hoặc Amazon S3.

Xem [yêu cầu sản phẩm](requirements.md) để biết phạm vi và quy tắc chi tiết,
[thiết kế kỹ thuật](../architecture/system-design.md) để xem kiến trúc và các
quyết định kỹ thuật,
[trạng thái hệ thống](../STATE.md) để xem trạng thái phát triển, và
[README gốc](../../README.md) để biết cách chạy dự án.
