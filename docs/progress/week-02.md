# Báo cáo tiến độ 18/10/2026 đến 24/10/2026

## Đã thực hiện

- Bổ sung API cộng tác theo task: danh sách/tạo/sửa/xóa bình luận; thành viên dự án được đọc, Owner/Member được tạo, tác giả quản lý bình luận của mình và Owner có thể quản lý bình luận của thành viên.
- Bổ sung quy trình đính kèm S3: tạo presigned upload URL, xác nhận upload qua `HeadObject`, liệt kê metadata, cấp presigned download URL và xóa tệp; mọi thao tác đều kiểm tra membership, vai trò và task còn hoạt động.
- Giới hạn tệp ở 10 MiB, MIME type theo allowlist cấu hình và presigned URL có thời hạn 5 phút. Object key dùng UUID ngẫu nhiên; tên người dùng không được dùng làm key.
- Thêm Prisma schema và migration `20261023010000_collaboration` cho `task_comments` và `attachments`, giữ metadata trong PostgreSQL và nội dung file trong object storage.
- Cấu hình AWS SDK S3, SeaweedFS cho môi trường local, S3 bucket riêng tư cho production và quyền IAM xóa object giới hạn trong bucket tệp đính kèm. Script phát hành đọc tên bucket từ SSM Parameter Store; Terraform khai báo parameter không bí mật này.
- Cập nhật README, tài liệu yêu cầu và thiết kế database về API, ma trận quyền, giới hạn tệp và quyết định upload/download.
- Bổ sung kiểm thử cho presigned URL; kiểm tra cấu hình yêu cầu cặp S3 access key/secret nếu dùng credential tĩnh.

## Kết quả kiểm tra

| Hạng mục | Kết quả |
|---|---|
| Prisma Client generation (`cd backend && npm run db:generate`) | Đạt |
| TypeScript (`cd backend && npm run typecheck`) | Đạt |
| Lint (`cd backend && npm run lint`) | Đạt |
| Unit tests (`cd backend && npm test -- --runInBand`) | Đạt: 3 test suites, 7 tests |
| Backend build (`cd backend && npm run build`) | Đạt |
| Terraform format (`terraform -chdir=infra/terraform fmt -check -recursive`) | Đạt |
| Terraform validation (`terraform -chdir=infra/terraform validate`) | Đạt |
| Production dependency audit (`cd backend && npm audit --omit=dev --audit-level=high`) | Đạt: không phát hiện vulnerability |
| `git diff --check` | Đạt |

## Chưa xác minh hoặc chưa triển khai

- E2E và integration với PostgreSQL/S3 chưa chạy được trong môi trường làm việc này vì Docker không khả dụng; kiểm thử e2e mới được bổ sung nhưng chưa thực thi.
- Migration collaboration chưa được áp dụng vào database local hoặc production; chưa có release mới, chưa deploy EC2 và chưa xác minh S3 trên AWS.
- Chưa chạy Terraform plan/apply cho parameter S3 bucket mới; việc Terraform validate chỉ xác nhận cấu hình, không tạo/cập nhật tài nguyên.
- Chưa kiểm thử upload/download thực tế trên SeaweedFS hoặc AWS S3. CORS bucket hiện có cần được cấu hình khớp origin frontend khi frontend/domain được triển khai.
- Frontend, thông báo/email, dashboard/CSV, task lặp, feature flags, HTTPS, backup/restore và Prometheus/Grafana vẫn chưa triển khai.

## Trạng thái

Backend có implementation cho bình luận và quy trình presigned S3 ở mã nguồn, đã qua typecheck, lint, unit tests, build và kiểm tra Terraform. Tính năng **chưa được xác minh bằng E2E hoặc triển khai production**; cần chạy migration và xác minh upload/download trước khi đánh dấu hoàn tất trên môi trường AWS.
