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

## Cập nhật xác minh ngày 24/10/2026

- CI trên PR cho commit collaboration `eb127c0` đã đạt cả ba job `test`, `e2e` và `image` ([CI run 39882111302](https://github.com/Vu-Trung-Kien/taskflow/actions/runs/39882111302)). Job E2E đã chạy migration trên PostgreSQL dùng riêng cho CI và toàn bộ E2E tests đạt.
- Tại môi trường làm việc hiện tại, `npm run db:generate`, `npm run lint`, `npm run typecheck`, `npm test -- --runInBand` (3 suites, 7 tests) và `npm run build` đều đạt. Docker CLI không khả dụng; không chạy E2E local hoặc thử upload/download thực tế với SeaweedFS.
- E2E hiện xác minh quyền bình luận và tạo yêu cầu presigned upload URL, nhưng chưa thực hiện luồng upload object, xác nhận qua `HeadObject`, download hoặc xóa trên một S3-compatible service. Vì vậy kiểm thử CI không thay thế integration test thực với SeaweedFS/AWS.
- Migration đã được kiểm tra trong CI trên database dùng riêng cho job, nhưng chưa có bằng chứng đã áp dụng vào production. Không tìm thấy CD thành công cho commit collaboration; lần chạy CD mới nhất được kiểm tra là `skipped` ([CD run 39882364685](https://github.com/Vu-Trung-Kien/taskflow/actions/runs/39882364685)). Chưa xác minh collaboration trên EC2 hoặc S3 production.
- Chưa chạy Terraform plan/apply cho parameter S3 bucket mới; việc Terraform validate chỉ xác nhận cấu hình, không tạo/cập nhật tài nguyên.
- CORS bucket hiện có cần được cấu hình khớp origin frontend khi frontend/domain được triển khai.
- Frontend, thông báo/email, dashboard/CSV, task lặp, feature flags, HTTPS, backup/restore và Prometheus/Grafana vẫn chưa triển khai.

## Trạng thái

Backend có implementation cho bình luận và quy trình presigned S3 ở mã nguồn; local lint, typecheck, unit tests, build và CI E2E đều đạt. Tuy nhiên, upload/download thực tế qua S3-compatible storage và triển khai production **chưa được xác minh**; cần hoàn tất integration test và release có phê duyệt trước khi đánh dấu collaboration đã hoàn tất trên AWS.
