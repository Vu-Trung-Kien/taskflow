# ADR-0004: Runtime image, health checks, migrations và S3 local

- Trạng thái: Accepted
- Ngày: 2026-10-16

## Quyết định

1. Dùng `node:22-bookworm-slim` thay Alpine để tránh khác biệt musl trong runtime Node/Prisma.
2. Docker `HEALTHCHECK` gọi `/health/live`; readiness phụ thuộc PostgreSQL và được kiểm tra riêng qua `/health/ready`.
3. Image có stage `migrator` riêng, chạy `prisma migrate deploy`; không chạy migration trong lúc API khởi động.
4. Prisma 7 Client được sinh vào `src/generated/prisma` rồi biên dịch cùng source TypeScript.
5. Local dùng SeaweedFS tương thích S3 thay MinIO; production dự kiến dùng AWS S3.

## Hệ quả

- Build image kiểm tra được cả Prisma generation và compilation; migrator chỉ chạy khi được gọi rõ ràng.
- Liveness không đánh dấu container chết chỉ vì database tạm gián đoạn; readiness mới phản ánh khả năng phục vụ phụ thuộc database.
- CI và môi trường chạy migration cần cung cấp `DATABASE_URL`.
- Hành vi SeaweedFS có thể khác S3 thật; cần kiểm thử tích hợp trên AWS trước khi nghiệm thu tính năng lưu file.
