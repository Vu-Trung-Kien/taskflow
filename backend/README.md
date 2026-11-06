# TaskFlow Backend

Backend API của TaskFlow được xây dựng bằng NestJS, TypeScript, Prisma 7 và
PostgreSQL 16.

## Chức năng

- Đăng ký, đăng nhập, duy trì phiên và đăng xuất.
- Quản lý dự án, membership, vai trò Owner/Member/Viewer và chuyển quyền Owner.
- Quản lý task/sub-task, bình luận và tệp đính kèm.
- Cung cấp dashboard metrics, xuất CSV, health check và thông tin build.

Các giá trị task dùng thống nhất: trạng thái `TODO`, `IN_PROGRESS`, `DONE`,
`BLOCKED`; mức ưu tiên `LOW`, `MEDIUM`, `HIGH`, `URGENT`.

## Cấu hình môi trường

Khi chạy backend trực tiếp, sao chép `.env.example` thành `.env`, cấu hình
`DATABASE_URL` trỏ đến PostgreSQL local và đặt `JWT_ACCESS_SECRET` ngẫu nhiên
dài ít nhất 32 byte. Không dùng secret mẫu trong production.

Local Compose cung cấp PostgreSQL, SeaweedFS S3 API và MailHog. Cấu hình S3
gồm `S3_BUCKET`, `S3_REGION`, các endpoint cần thiết cho local và
`S3_ALLOWED_CONTENT_TYPES`. Backend giới hạn mỗi tệp ở **10 MiB** và
presigned URL có hiệu lực **5 phút**.

Access JWT hết hạn sau **15 phút**. Refresh token được xoay vòng sau mỗi lần
sử dụng thành công; mỗi auth session có thời hạn tuyệt đối **30 ngày** kể từ
khi tạo. Refresh không kéo dài thời hạn session.

## Chạy và kiểm thử

```bash
npm ci
npm run db:generate
npm run start:dev
```

Chạy các kiểm tra backend từ thư mục này:

```bash
npm run lint
npm run typecheck
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

E2E test cần PostgreSQL local và `DATABASE_URL` trỏ đến database kiểm thử.

## Migration

Tạo/cập nhật migration trong môi trường phát triển bằng:

```bash
npm run db:migrate:dev
```

Quy trình deploy production áp dụng migration bằng `prisma migrate deploy`.
Không sửa migration đã phát hành và không reset dữ liệu production.

## Tài liệu

- [README dự án](../README.md)
- [Thiết kế kỹ thuật](../docs/TECHNICAL_DESIGN_DOCUMENT.md)
- [Yêu cầu sản phẩm](../docs/requirements.md)
- [Thiết kế cơ sở dữ liệu](../docs/database-design.md)
- [Hướng dẫn triển khai production](../deploy/README.md)
