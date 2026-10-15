# Báo cáo tiến độ 11/10/2026 đến 17/10/2026

- Khởi tạo repo, quy ước nhánh (main được bảo vệ, làm việc qua PR), Conventional Commits.
- Docker Compose local: Postgres, API, MailHog, object storage giả lập S3.
- Khung NestJS với /health/live và /health/ready; Prisma schema và migration init.
- Terraform: Security Group, EC2, ECR, S3, IAM role cho GitHub OIDC, instance profile cho SSM.
- Pipeline: build image, push ECR, deploy lên EC2.
- Quản lý phiên bản (phần nền): ECR immutable tag, lifecycle policy, build-arg git SHA.


