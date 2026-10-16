variable "aws_region" {
  description = "AWS region in which the TaskFlow host and data resources are created."
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Lowercase project identifier used for resource names and tags."
  type        = string
  default     = "taskflow"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "project_name may contain lowercase letters, digits, and hyphens only."
  }
}

variable "github_repository" {
  description = "GitHub owner/repository allowed to assume the release role."
  type        = string
  default     = "Vu-Trung-Kien/taskflow"
}

variable "github_branch" {
  description = "Only this branch can assume the GitHub Actions release role."
  type        = string
  default     = "main"
}

variable "instance_type" {
  description = "EC2 instance size; validate memory needs before enabling all services."
  type        = string
  default     = "t3.small"
}

variable "postgres_data_size_gb" {
  description = "Size of the dedicated encrypted EBS volume for PostgreSQL data."
  type        = number
  default     = 20

  validation {
    condition     = var.postgres_data_size_gb >= 20
    error_message = "The PostgreSQL data volume must be at least 20 GiB."
  }
}

variable "backup_retention_days" {
  description = "Number of days to retain PostgreSQL backup objects in S3."
  type        = number
  default     = 35

  validation {
    condition     = var.backup_retention_days >= 7
    error_message = "Keep at least seven days of database backups."
  }
}

variable "attachment_cors_origins" {
  description = "Browser origins allowed to use presigned S3 requests."
  type        = list(string)
  default     = ["http://localhost:5173"]
}
