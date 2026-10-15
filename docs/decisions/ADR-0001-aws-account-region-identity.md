# ADR-0001: AWS account, region và danh tính làm việc

- Trạng thái: Accepted
- Ngày: 2026-10-15
- Phân loại: Quyết định thiết kế

## Bối cảnh
Đề tài yêu cầu triển khai trên AWS với chi phí thấp và không dùng access key
tĩnh. Account đang dùng Free Tier credits. Theo tài liệu AWS, việc tham gia
AWS Organizations (bao gồm IAM Identity Center) làm credits hết hạn ngay.

## Quyết định
1. Region thống nhất: ap-southeast-1 (Singapore), gần Việt Nam nhất.
2. Không dùng IAM Identity Center để bảo toàn Free Tier credits.
3. Root account: bật MFA, không có access key, chỉ dùng cho việc hiếm.
4. Danh tính làm việc: IAM user "taskflow-dev" chỉ có quyền sts:AssumeRole
   vào role "taskflow-admin". Role này có trust policy bắt buộc MFA
   (aws:MultiFactorAuthPresent = true). Credential thực sự dùng là
   credential tạm thời của role.
5. GitHub Actions dùng OIDC, EC2 dùng instance profile. Không có access key
   tĩnh nào ngoài key của IAM user ở máy cá nhân.

## Hệ quả
- Access key của taskflow-dev nằm trên máy cá nhân (~/.aws/credentials).
  Rủi ro được giảm vì key không dùng được nếu thiếu MFA. Đây là một hạn chế
  cần nêu trong báo cáo.
- Phải xóa key khi kết thúc dự án và đổi key định kỳ.
- Role taskflow-admin có AdministratorAccess chỉ để bootstrap, sẽ thay bằng
  các role hẹp quyền cho GitHub OIDC và EC2 ở bước Terraform.
- Cần kiểm tra thời hạn Free plan và giới hạn dịch vụ trước khi dựng hạ tầng.

## Phương án đã loại
- IAM Identity Center: an toàn hơn nhưng làm mất credits.
- IAM user có quyền Admin trực tiếp + access key: key lộ là mất account.
