# Khởi tạo S3 bucket lưu Terraform state

Terraform root này dùng để tạo state bucket mới trong tài khoản chưa có bucket
phù hợp. Trước khi S3 bucket được tạo, Terraform lưu state cục bộ.

## State bucket TaskFlow hiện có

Theo thông tin được cung cấp, state bucket của TaskFlow đã được tạo tại
`ap-southeast-1`. Cấu hình bucket chưa được xác minh độc lập bằng output từ
AWS. Với tài khoản này, **không chạy `terraform apply` từ `infra/bootstrap`**:
root này sẽ thử tạo bucket và bị xung đột nếu bucket đã tồn tại.

Sau khi xác minh bucket hiện có và danh tính AWS đang sử dụng, cấu hình
production root dùng bucket đó trong file bị Git bỏ qua
`infra/terraform/backend.hcl`. Xem
[hướng dẫn Terraform production](../terraform/README.md) để biết các lệnh kiểm
tra chỉ đọc và cách khởi tạo backend. Nếu bucket đã tồn tại thì không cần khởi
tạo hoặc apply bootstrap root.

Production root chỉ dùng bucket này để lưu Terraform state và lockfile. Root
này khai báo các bucket riêng cho tệp đính kèm và bản sao lưu PostgreSQL.

## Tạo state bucket mới

Chỉ dùng quy trình này khi tài khoản đích chưa có state bucket cần dùng. Xác
thực bằng AWS CLI profile được chọn rõ ràng và MFA nếu cần; không dùng thông
tin xác thực của root account và không đưa credential vào repository.

```bash
terraform -chdir=infra/bootstrap init
terraform -chdir=infra/bootstrap validate
terraform -chdir=infra/bootstrap plan
terraform -chdir=infra/bootstrap apply
terraform -chdir=infra/bootstrap output -raw state_bucket_name
```

Cấu hình bootstrap khai báo cách đặt tên theo account, quyền sở hữu bucket,
chặn truy cập công khai, versioning, mã hóa AES256 mặc định và policy từ chối
các yêu cầu không dùng TLS. Đây là mô tả cấu hình Terraform, không chứng minh
các thiết lập đó đang có trên một bucket được tạo thủ công.

State của bootstrap root vẫn được lưu cục bộ. Giữ file state riêng tư và sao
lưu an toàn; tuyệt đối không commit file này. Không đưa credential, access key,
mã MFA hoặc session token vào file Terraform, lịch sử lệnh hay Git.
