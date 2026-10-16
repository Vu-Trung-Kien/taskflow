# ADR-0004: Runtime image, kiểm tra sức khỏe, migration và S3 local

- Trạng thái: Đã chấp thuận
- Ngày: 2026-10-16

## Quyết định

1. Dùng `node:22-bookworm-slim` thay Alpine để tránh khác biệt musl trong runtime Node/Prisma.
2. Docker `HEALTHCHECK` gọi `/health/live`; readiness phụ thuộc PostgreSQL và được kiểm tra riêng qua `/health/ready`.
3. Image có stage `migrator` riêng, chạy `prisma migrate deploy`; không chạy migration trong lúc API khởi động.
4. Prisma 7 Client được sinh vào `src/generated/prisma` rồi biên dịch cùng source TypeScript.
5. Local dùng SeaweedFS tương thích S3 thay MinIO; production dự kiến dùng AWS S3.

## Hệ quả

- Build image kiểm tra cả quá trình tạo Prisma Client và biên dịch; migrator chỉ chạy khi được gọi rõ ràng.
- Liveness không đánh dấu container là chết chỉ vì database tạm thời gián đoạn; readiness mới phản ánh khả năng phục vụ có phụ thuộc database.
- CI và môi trường chạy migration cần cung cấp `DATABASE_URL`.
- SeaweedFS có thể hoạt động khác S3 thật; cần kiểm thử tích hợp trên AWS trước khi nghiệm thu tính năng lưu file.
