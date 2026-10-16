output "instance_id" {
  description = "EC2 instance ID; use SSM Run Command for administration and deployment."
  value       = aws_instance.app.id
}

output "instance_public_ip" {
  description = "Public IPv4 address for the web ingress; it may change when the instance is replaced."
  value       = aws_instance.app.public_ip
}

output "instance_public_dns" {
  description = "Public DNS name for the web ingress."
  value       = aws_instance.app.public_dns
}

output "ecr_repository_url" {
  description = "Immutable-tag ECR repository for API release images."
  value       = aws_ecr_repository.api.repository_url
}

output "attachments_bucket_name" {
  description = "Private S3 bucket for application attachments."
  value       = aws_s3_bucket.attachments.bucket
}

output "backups_bucket_name" {
  description = "Private S3 bucket for PostgreSQL backups."
  value       = aws_s3_bucket.backups.bucket
}

output "postgres_volume_id" {
  description = "Encrypted EBS volume attached to the PostgreSQL data mount."
  value       = aws_ebs_volume.postgres.id
}

output "github_actions_role_arn" {
  description = "Configure this ARN as the GitHub Actions AWS role-to-assume."
  value       = aws_iam_role.github_actions_release.arn
}

output "ec2_instance_profile_name" {
  description = "EC2 instance profile for SSM, ECR pulls, S3 and Parameter Store."
  value       = aws_iam_instance_profile.ec2.name
}
