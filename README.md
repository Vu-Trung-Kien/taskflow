# TaskFlow — Project 1 (HUST)

## Đề cương

TaskFlow được phát triển theo từng bước, bắt đầu với nền tảng backend và môi trường local; các tính năng nghiệp vụ sẽ được xác định trong tài liệu yêu cầu riêng.

## Kiến trúc hiện tại

- **Backend:** NestJS, TypeScript, Prisma 7.
- **Database:** PostgreSQL 16.
- **Local object storage:** SeaweedFS cung cấp S3 API; MinIO không còn là lựa chọn trong cấu hình hiện tại.
- **Local email:** MailHog.
- **Đóng gói:** Docker multi-stage; Compose điều phối các service local.
- **Triển khai dự kiến:** AWS, với hạ tầng được quản lý bằng Terraform.

## Chạy local

Tạo file `.env` từ `.env.example`, sau đó chạy:

```bash
docker compose up --build
```

API lắng nghe trên `http://localhost:3000`; PostgreSQL, MailHog và SeaweedFS chỉ được bind vào loopback trên máy phát triển.

## Tài liệu

- [Báo cáo tiến độ tuần 1](docs/progress/week-01.md)
- [ADR-0004: runtime image, health checks, migrations và S3 local](docs/decisions/ADR-0004-runtime-image-and-local-s3.md)
- [Bootstrap Terraform state](infra/bootstrap/README.md)
- [Terraform AWS foundation](infra/terraform/README.md)