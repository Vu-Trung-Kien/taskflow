# Nền tảng AWS của TaskFlow

Terraform root này tạo nền tảng một máy chủ tại `ap-southeast-1`:

- EC2 Amazon Linux 2023 cài Docker, có quyền truy cập SSM, bắt buộc IMDSv2;
  chỉ mở cổng công khai 80 và 443. Không có rule SSH; PostgreSQL và cổng
  container API không được security group mở ra ngoài.
- Một EBS gp3 mã hóa riêng, mount tại `/var/lib/taskflow/postgres` và bật
  `prevent_destroy`. Cấu hình Compose khi triển khai phải dùng image PostgreSQL
  có UID 999 (ví dụ `postgres:16-bookworm`) cho bind mount này.
- ECR dùng tag bất biến và lifecycle policy giữ lại 10 image mới nhất.
- Hai S3 bucket riêng tư cho tệp đính kèm và bản sao lưu PostgreSQL, có mã hóa,
  versioning, bucket policy chỉ cho phép TLS, CORS cho trình duyệt sử dụng
  presigned URL và thời hạn lưu bản sao lưu có thể cấu hình (mặc định 35 ngày).
- OIDC trust của GitHub Actions chỉ cho phép nhánh `main` trong repository đã
  cấu hình. EC2 có instance profile để dùng SSM, tải image từ ECR, truy cập S3
  và đọc giá trị SSM Parameter Store của môi trường production.

## Danh tính AWS và credential

Theo thông tin được cung cấp, cấu hình operator của account như sau:

- `taskflow-base` là profile nguồn chứa credential CLI của IAM user
  `taskflow-dev`, được lưu cục bộ trong `~/.aws/credentials`.
- `taskflow` dự kiến assume role `taskflow-admin` từ profile nguồn đó; role
  được báo là yêu cầu MFA.
- `taskflow-admin` được báo là có policy `AdministratorAccess`.

Các thông tin trên chưa được xác minh độc lập bằng policy output từ AWS. Chỉ
lưu access key trong AWS credentials store cục bộ. Không commit credential, mã
serial của thiết bị MFA, session token hoặc ARN theo account vào repository.
Policy `AdministratorAccess` áp dụng trên toàn account và có phạm vi rất rộng:
nếu khả thi, hãy dùng policy operator giới hạn quyền cho công việc Terraform
hằng ngày và chỉ dùng role admin để bootstrap hoặc xử lý tác vụ quản trị đặc
biệt.

Trước khi dùng Terraform, xác nhận danh tính đang hoạt động và kiểm tra các
quyền đã nêu bằng AWS CLI chỉ đọc. Thay `<STATE_BUCKET_NAME>` bằng tên bucket
thật tại máy cục bộ; không commit giá trị đó.

```bash
aws sts get-caller-identity --profile taskflow

BUCKET="<STATE_BUCKET_NAME>"
aws s3api get-bucket-location --bucket "$BUCKET" --profile taskflow
aws s3api get-public-access-block --bucket "$BUCKET" --profile taskflow
aws s3api get-bucket-versioning --bucket "$BUCKET" --profile taskflow
aws s3api get-bucket-encryption --bucket "$BUCKET" --profile taskflow
aws s3api get-bucket-policy-status --bucket "$BUCKET" --profile taskflow
aws s3api get-bucket-policy --bucket "$BUCKET" --profile taskflow

aws iam get-user --user-name taskflow-dev --profile taskflow
aws iam get-user-policy --user-name taskflow-dev \
  --policy-name AssumeTaskflowAdmin --profile taskflow
aws iam list-mfa-devices --user-name taskflow-dev --profile taskflow
aws iam get-role --role-name taskflow-admin --profile taskflow
aws iam list-attached-role-policies --role-name taskflow-admin \
  --profile taskflow
```

Xác nhận caller là role `taskflow-admin` đã assume; bucket ở
`ap-southeast-1`; cả bốn thiết lập chặn truy cập công khai đều bật; versioning
được bật; mã hóa mặc định là AES256 (hoặc dùng KMS key đã được chủ đích lựa
chọn); bucket policy từ chối truyền tải không an toàn. Kiểm tra inline policy
của user và trust policy của role để xác nhận chính xác role được phép,
principal tin cậy và điều kiện MFA. `get-role` trả về trust policy của role;
danh sách policy đính kèm cho biết có `AdministratorAccess`, nhưng điều đó
không làm giảm phạm vi quyền của policy này. Hãy che account ID, ARN, user ID
và tên bucket trước khi chia sẻ output. Tuyệt đối không chia sẻ credential
hoặc mã MFA.

Cho đến khi kiểm tra các output đó, cấu hình bảo vệ bucket và việc bắt buộc MFA
vẫn chỉ là thông tin người dùng cung cấp, chưa được xác minh. Bootstrap source
Terraform khai báo các biện pháp này cho bucket do nó tạo; source đó không
chứng minh cấu hình của bucket được tạo thủ công.

Trước khi chạy Terraform, chọn profile assumed-role cho shell hiện tại rồi xác
nhận lại caller. Kiểm tra để bảo đảm credential đặt qua biến môi trường không
ghi đè profile đã chọn.

```bash
export AWS_PROFILE=taskflow
aws sts get-caller-identity
```

## Cấu hình state bucket hiện có

Theo thông tin được cung cấp, state bucket đã được tạo tại `ap-southeast-1`;
các thiết lập của bucket vẫn cần được xác minh bằng các lệnh chỉ đọc ở trên.
Không chạy `apply` từ bootstrap root với bucket này: root đó sẽ thử tạo bucket,
không tự nhận quản lý một bucket đã được tạo thủ công.

Sau khi xác nhận bucket và danh tính AWS, sao chép `backend.hcl.example` thành
`backend.hcl` — file này đã bị Git bỏ qua — rồi thay tên bucket mẫu bằng tên
thật tại máy cục bộ. Không commit account ID hoặc tên bucket thật.

```bash
cp infra/terraform/backend.hcl.example infra/terraform/backend.hcl
# Chỉnh sửa infra/terraform/backend.hcl cục bộ để điền tên state bucket thật.

terraform -chdir=infra/terraform init -backend-config=backend.hcl
terraform -chdir=infra/terraform fmt -check -recursive
terraform -chdir=infra/terraform validate
```

Backend dùng S3 lockfile (`use_lockfile = true`) và yêu cầu Terraform phiên
bản 1.10 trở lên. Terraform state có thể chứa dữ liệu nhạy cảm; mã hóa bucket
không thay thế cho việc giới hạn quyền truy cập. Không chia sẻ hoặc commit file
state.

## Lập kế hoạch và áp dụng

Chỉ sau khi backend đã khởi tạo và đã rà soát danh tính, biện pháp bảo vệ
bucket cùng cấu hình, hãy xem plan:

```bash
terraform -chdir=infra/terraform plan
```

Rà soát plan cụ thể, AWS account, region, giả định về default VPC/subnet và chi
phí EC2, public IPv4, EBS, S3 cùng truyền dữ liệu. Mặc định cấu hình instance
`t3.small`, volume PostgreSQL 20 GiB và thời hạn lưu backup 35 ngày; đây là giá
trị mặc định, không phải ước tính chi phí.

Chỉ apply sau khi plan cụ thể đã được rà soát và có phê duyệt rõ ràng:

```bash
terraform -chdir=infra/terraform apply
```

Không đặt secret runtime trong `.tfvars`, user data, workflow hoặc tài nguyên
do Terraform quản lý. Lưu secret runtime dưới dạng SSM Parameter Store
`SecureString` tại `/<project>/production/`; instance role có thể đọc các giá
trị này. Cấp các giá trị parameter qua quy trình operator an toàn; không commit
hoặc quản lý giá trị secret trong Terraform state này.

## Phạm vi hiện tại

- Production root chỉ dùng state bucket hiện có để lưu Terraform state và
  lockfile. Root này khai báo riêng bucket tệp đính kèm và bucket backup.
- Terraform plan và CI validation không chứng minh tài nguyên đã được tạo.
- Root này chưa triển khai ứng dụng, tạo DNS công khai, cài chứng chỉ, lên lịch
  backup hoặc cấu hình Prometheus/Grafana. Đây là các mốc CD/vận hành riêng.
- HTTPS công khai cần domain và DNS trỏ đến hệ thống. Domain hiện chưa được
  quyết định.
- PostgreSQL tiếp tục chạy trong Docker container trên EBS đã gắn; không tạo
  tài nguyên RDS.
