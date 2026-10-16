# Yêu cầu TaskFlow

- Trạng thái: Bản nháp; mặc định về vai trò, trạng thái, ưu tiên và xóa đã được duyệt
- Phạm vi tài liệu: Nền tảng sản phẩm và mốc backend-first đầu tiên

## Mục tiêu

TaskFlow là ứng dụng web quản lý dự án và công việc, đồng thời là dự án thực hành chu trình DevOps từ code, build, test đến deploy và monitor trên AWS.

## Yêu cầu chức năng sản phẩm

1. Người dùng đăng ký, đăng nhập bằng JWT.
2. Người dùng tạo và quản lý dự án; mỗi dự án có thành viên với một trong các vai trò Owner, Member, Viewer.
3. Người dùng có quyền tạo, xem, cập nhật và xóa công việc trong dự án. Công việc có trạng thái, mức ưu tiên, hạn hoàn thành, người thực hiện và công việc con.
4. Thành viên có thể bình luận và đính kèm tệp; tệp lưu trên Amazon S3 và được trao đổi bằng presigned URL.
5. Ứng dụng có thông báo trong ứng dụng và email, dashboard thống kê, xuất báo cáo CSV.
6. Công việc có thể lặp hằng ngày, hằng tuần hoặc hằng tháng.
7. Có feature flag để bật/tắt tính năng mới.
8. Có `/health/live` và `/health/ready`.

## Mốc backend-first đầu tiên

Mốc đầu tiên tập trung vào API, database và authorization; chưa bao gồm frontend:

- Đăng ký/đăng nhập và xác thực JWT.
- CRUD dự án, quản lý membership và vai trò.
- CRUD task/sub-task với trạng thái, ưu tiên, hạn hoàn thành và assignee.
- Các API nghiệp vụ phải kiểm tra quyền theo membership của đúng dự án.
- PostgreSQL/Prisma migrations, validation, unit/e2e tests và CI.
- Phát hành qua CD hiện có; xác minh qua SSM hoặc truy cập bị giới hạn, không mở API trực tiếp cho Internet.

## Ma trận quyền đã duyệt

| Hành động | Owner | Member | Viewer |
|---|---:|---:|---:|
| Xem dự án và task | Có | Có | Có |
| Sửa metadata dự án | Có | Không | Không |
| Quản lý membership/vai trò | Có | Không | Không |
| Tạo và sửa task/sub-task | Có | Có | Không |
| Xóa task | Có | Có | Không |
| Bình luận/đính kèm tệp | Có | Có | Không |
| Archive/khôi phục dự án, chuyển quyền Owner | Có | Không | Không |

## Yêu cầu chất lượng và bảo mật

- Mật khẩu chỉ được lưu dưới dạng password hash; không ghi credential/token vào log.
- API nghiệp vụ cần xác thực, kiểm tra input và thực thi quyền ở backend.
- Truy cập dữ liệu dự án phải được giới hạn theo membership; kiểm thử phải bao gồm truy cập chéo dự án.
- Thay đổi schema đi qua Prisma migration; CI giữ lint, typecheck, unit, e2e, image build và Trivy.
- Health check phân biệt liveness với khả năng kết nối database (readiness).
- Không công khai API trước khi có HTTPS/reverse proxy và vận hành backup/restore, monitoring cơ bản.

## Các quyết định còn cần chốt

- Quy tắc email verification (được hoãn đến khi production email sẵn sàng).
- Phạm vi, độ sâu và chu kỳ tạo công việc lặp; cách xử lý tháng không có ngày tương ứng.
- Dung lượng/kích thước tệp tối đa, định dạng được phép và thời hạn presigned URL.
- Múi giờ dùng cho hạn hoàn thành/lặp định kỳ và chính sách lưu trữ/xóa dữ liệu người dùng.

## Mặc định đã duyệt

- Mỗi dự án có đúng một Owner hiện hành; chỉ Owner quản lý membership/vai trò và chuyển quyền.
- Member có thể tạo, sửa, xóa task/sub-task, bình luận và đính kèm; Viewer chỉ đọc.
- Sub-task giới hạn một cấp.
- Trạng thái task: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Mức ưu tiên: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- Dự án được archive/khôi phục; không xóa dây chuyền dữ liệu dự án.
- Task được soft-delete/khôi phục qua `deleted_at`; thao tác xóa không xóa comments/attachments liên quan.
- Access JWT có thời hạn 15 phút và gắn với auth session đang hoạt động; refresh token ngẫu nhiên được lưu dưới dạng SHA-256 hash, xoay vòng sau mỗi lần dùng và có thể thu hồi khi logout/phát hiện replay.
- Một auth session có giới hạn tuyệt đối 30 ngày từ lúc đăng nhập; refresh không kéo dài giới hạn này. Email verification chưa bắt buộc ở MVP.
