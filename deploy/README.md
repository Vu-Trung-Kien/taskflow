# Triển khai production

Workflow [CD](../.github/workflows/cd.yml) tự chạy sau khi CI thành công trên `main`. Workflow build và quét hai image, đẩy tag SHA bất biến lên ECR rồi gửi lệnh triển khai qua AWS Systems Manager (SSM). GitHub Actions không đọc secret production; EC2 lấy secret trực tiếp từ Parameter Store.

## Cấu hình trước lần phát hành đầu tiên

1. Trong GitHub repository settings, tạo hai **Actions variables** (không phải secrets):
   - `AWS_ROLE_ARN`: output Terraform `github_actions_role_arn`.
   - `EC2_INSTANCE_ID`: instance ID production.
2. Trong AWS Systems Manager Parameter Store, tạo ba parameter loại **SecureString**, dùng AWS managed key `aws/ssm`, ở region `ap-southeast-1`:
   - `/taskflow/production/postgres-user`: 1-63 ký tự ASCII, chỉ chữ cái, chữ số, `_`.
   - `/taskflow/production/postgres-password`: tối thiểu 32 ký tự ASCII, chỉ chữ cái, chữ số, `-`, `_`. Tạo mật khẩu ngẫu nhiên mạnh; không gửi qua chat, không ghi vào GitHub, shell history hay tài liệu.
   - `/taskflow/production/postgres-db`: 1-63 ký tự ASCII, chỉ chữ cái, chữ số, `_`.
3. Dùng cùng các giá trị này cho lần đầu khởi tạo PostgreSQL. Thay đổi chúng sau khi PostgreSQL đã được tạo không tự đổi user/password/database bên trong volume; cần quy trình rotation riêng.
4. Chỉ merge/release khi cả ba parameter đã tạo và EC2 vẫn `Online` trong Systems Manager. Không lưu secret trong repository hoặc Actions variables.

## Hoạt động phát hành

- Release tự động chỉ chạy sau workflow `CI` thành công trên `main`. Workflow OIDC chỉ dùng IAM role để push/pull image và gửi SSM command; GitHub không có quyền đọc Parameter Store.
- ECR lưu API image ở tag `<commit-sha>` và image migration ở `<commit-sha>-migrator`. Cả hai tag là bất biến; workflow kiểm tra Trivy trước khi push và dùng lại đúng image nếu retry.
- Migrator image chỉ giữ production dependencies cùng Prisma CLI/`dotenv` đã ghim phiên bản; npm và các dev tools được loại bỏ để tránh phát hành image chứa lỗ hổng không cần thiết. CI cũng build và quét cả hai image.
- EC2 dùng Docker Compose riêng, PostgreSQL gắn trực tiếp vào `/var/lib/taskflow/postgres` trên EBS, không publish cổng database. API chỉ bind vào `127.0.0.1:3000`; chưa có reverse proxy/HTTPS trong bước này.
- Nếu chưa có Docker Compose plugin, deploy tải bản `v2.39.4` từ release chính thức và xác minh SHA-256 trước khi cài.
- Mỗi lần deploy: pull image, chờ PostgreSQL healthy, chạy `prisma migrate deploy` bằng migrator image riêng, thay API, rồi xác minh `/health/ready` và `gitSha` của `/version`. Script khôi phục image API cũ nếu API mới không healthy; migration database không tự rollback.
- Lifecycle policy ECR hiện giữ tối đa 10 image trong repository. Do mỗi release dùng hai image riêng, số bản phát hành có thể rollback còn lại tối đa khoảng năm; kiểm tra/chỉnh lifecycle policy nếu cần giữ nhiều lịch sử hơn.

## Rollback ứng dụng

Từ Actions, chạy workflow **CD** thủ công trên nhánh `main`, nhập commit SHA 40 ký tự của release cần khôi phục. Workflow chỉ deploy lại hai image đã tồn tại trong ECR, vẫn chạy migrations đang có trong image đó, rồi kiểm tra health/version. Rollback image không rollback schema PostgreSQL; chỉ chọn bản ứng dụng tương thích với schema hiện tại.

Sau release đầu tiên, xác minh trong Actions log trạng thái SSM `Success` cùng dòng xác nhận `/health/ready` và `/version`. Khi cần chẩn đoán, dùng command ID được log để xem output trong Systems Manager Run Command; script không in giá trị SecureString.
