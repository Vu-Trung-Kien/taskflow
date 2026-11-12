<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Logo Nest" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">Framework <a href="http://nodejs.org" target="_blank">Node.js</a> tiến bộ, hỗ trợ xây dựng ứng dụng phía máy chủ hiệu quả và có khả năng mở rộng.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="Phiên bản NPM" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Giấy phép package" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="Lượt tải NPM" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Cộng đồng Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Ủng hộ qua PayPal"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Ủng hộ dự án"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Theo dõi Nest trên Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Mô tả

Repository khởi đầu cho framework TypeScript [Nest](https://github.com/nestjs/nest).

## Thiết lập dự án

```bash
$ npm install
```

Khi chạy API trực tiếp, sao chép `.env.example` thành `.env`, đặt `DATABASE_URL`
trỏ tới môi trường local và tạo `JWT_ACCESS_SECRET` ngẫu nhiên dài ít nhất 32
byte. Không dùng giá trị mẫu làm secret production.

## API nghiệp vụ hiện có

Mọi endpoint dưới đây, ngoại trừ đăng ký/đăng nhập/refresh/logout và health/version,
đều yêu cầu `Authorization: Bearer <access-token>`.

- `POST /auth/register`, `POST /auth/login`: đăng ký/đăng nhập; trả access JWT 15
  phút và đặt refresh token trong cookie HttpOnly.
- `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`: xoay/thu hồi phiên
  refresh có giới hạn tuyệt đối 30 ngày và xem hồ sơ hiện tại. Logout thu hồi cả
  access JWT gắn với phiên ngay lập tức.
- `/projects`: CRUD dự án bằng archive/restore; Owner quản lý thành viên và có
  thể chuyển quyền Owner.
- `/projects/:projectId/tasks`: CRUD task/sub-task; Owner/Member được ghi,
  Viewer chỉ đọc. Xóa task là soft-delete; task có thể được lọc/khôi phục.
- `/projects/:projectId/tasks/:taskId/comments`: thành viên đọc; Owner/Member
  tạo, sửa/xóa bình luận của mình; Owner có thể sửa/xóa bình luận của thành viên.
- `/projects/:projectId/tasks/:taskId/attachments`: Owner/Member yêu cầu URL
  upload presigned, xác nhận upload, lấy URL download hoặc xóa tệp của mình;
  Owner có thể xóa tệp của thành viên. URL hết hạn sau 5 phút, tệp tối đa
  10 MiB và MIME type phải nằm trong allowlist cấu hình.
- `/health/live`, `/health/ready`, `/version`: kiểm tra vận hành.

Local development dùng SeaweedFS với S3 API. Production dùng bucket S3 riêng tư
và IAM role của EC2; không cấu hình access key AWS tĩnh. Set `S3_BUCKET` và
`S3_REGION`; local Compose cũng đặt endpoint nội bộ `S3_ENDPOINT` cùng endpoint
trình duyệt `S3_PUBLIC_ENDPOINT`. `S3_ALLOWED_CONTENT_TYPES` nhận danh sách MIME
type phân tách bằng dấu phẩy.

Frontend, notifications/email, recurrence, dashboard, CSV, feature flags,
HTTPS, backup/restore và monitoring chưa được triển khai.

## Biên dịch và chạy dự án

```bash
# môi trường phát triển
$ npm run start

# chế độ theo dõi thay đổi
$ npm run start:dev

# môi trường production
$ npm run start:prod
```

## Chạy kiểm thử

```bash
# kiểm thử unit
$ npm run test

# kiểm thử e2e
$ npm run test:e2e

# độ bao phủ kiểm thử
$ npm run test:cov
```

## Triển khai

Khi sẵn sàng triển khai ứng dụng NestJS lên production, hãy tham khảo
[tài liệu triển khai](https://docs.nestjs.com/deployment) để biết các bước giúp
ứng dụng vận hành hiệu quả.

Nếu cần nền tảng cloud để triển khai ứng dụng NestJS, có thể tham khảo
[Mau](https://mau.nestjs.com), nền tảng chính thức để triển khai NestJS trên
AWS. Mau đơn giản hóa quy trình triển khai:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

Với Mau, bạn có thể triển khai ứng dụng chỉ sau vài thao tác và tập trung vào
xây dựng tính năng thay vì quản lý hạ tầng.

## Observability (khả năng quan sát)

Với ứng dụng production, observability giúp hiểu cách hệ thống hoạt động, phát
hiện sớm sự cố và duy trì hiệu năng ổn định.

[NestJS Observe](https://observe.nestjs.com) tự động instrument ứng dụng
NestJS, cung cấp khả năng quan sát hệ thống với ít bước cấu hình:

- **Distributed tracing:** Theo dõi request qua nhiều service và hiểu luồng xử
  lý trong hệ thống.
- **Phân tích waterfall:** Trực quan hóa quá trình xử lý request để tìm thao
  tác chậm, nút thắt và độ trễ bất thường.
- **Phân tích hiệu năng:** Phân tích hiệu năng ứng dụng theo thời gian thực và
  nhanh chóng xác định khu vực cần tối ưu.
- **Metrics:** Theo dõi các chỉ số quan trọng của ứng dụng và hạ tầng để nắm
  tình trạng hệ thống cũng như xu hướng hiệu năng.
- **Logging:** Tập trung log và liên kết log với trace cùng telemetry khác để
  hỗ trợ gỡ lỗi.
- **Theo dõi lỗi:** Phát hiện lỗi nhanh và điều tra nguyên nhân cùng ngữ cảnh
  liên quan.
- **Giám sát SLA:** Theo dõi mục tiêu mức dịch vụ và nhận biết khi ứng dụng
  sắp chạm hoặc vượt ngưỡng đã đặt.
- **Cảnh báo:** Thiết lập cảnh báo cho lỗi nghiêm trọng, suy giảm hiệu năng,
  vi phạm SLA và bất thường khác để nhóm xử lý kịp thời.

Để thêm vào dự án:

```bash
$ npm install @nestjs/observe
```

Sau đó làm theo [hướng dẫn thiết lập](https://docs.nestjs.com/observability/overview);
cần thêm một import và app key.

Gói miễn phí không yêu cầu thông tin thanh toán và hỗ trợ 300.000 event mỗi
tháng. Bạn cũng có thể xem trước [bản demo trực tiếp](https://www.observe-demo.nestjs.com/dashboard);
không cần cài đặt gì.

## Tài nguyên

Một số tài nguyên hữu ích khi làm việc với NestJS:

- Tìm hiểu thêm về framework qua [tài liệu NestJS](https://docs.nestjs.com).
- Đặt câu hỏi và nhận hỗ trợ tại [kênh Discord](https://discord.gg/G7Qnnhy).
- Xem các [khóa học video chính thức](https://courses.nestjs.com/) để tìm hiểu
  sâu hơn và thực hành.
- Triển khai ứng dụng lên AWS chỉ với vài thao tác thông qua
  [NestJS Mau](https://mau.nestjs.com).
- Tự động instrument ứng dụng với [NestJS Observe](https://observe.nestjs.com)
  để đơn giản hóa distributed tracing, metrics và logging; đồng thời theo dõi
  lỗi và hiệu năng ứng dụng NestJS.
- Trực quan hóa đồ thị ứng dụng và tương tác với ứng dụng NestJS theo thời gian
  thực bằng [NestJS Devtools](https://devtools.nestjs.com).
- Nếu cần hỗ trợ cho dự án (bán thời gian hoặc toàn thời gian), tham khảo
  [dịch vụ hỗ trợ doanh nghiệp](https://enterprise.nestjs.com).
- Theo dõi [X](https://x.com/nestframework) và
  [LinkedIn](https://linkedin.com/company/nestjs) để cập nhật tin mới.
- Tìm việc hoặc đăng tuyển tại [bảng việc làm chính thức](https://jobs.nestjs.com).

## Hỗ trợ

Dự án mã nguồn mở Nest sử dụng giấy phép MIT và phát triển nhờ các nhà tài trợ
cùng những người ủng hộ. Nếu muốn tham gia, hãy [xem thêm tại đây](https://docs.nestjs.com/support).

## Liên hệ

- Tác giả: [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Trang web: [https://nestjs.com](https://nestjs.com/)
- Twitter: [@nestframework](https://twitter.com/nestframework)

## Giấy phép

Nest sử dụng [giấy phép MIT](https://github.com/nestjs/nest/blob/master/LICENSE).
