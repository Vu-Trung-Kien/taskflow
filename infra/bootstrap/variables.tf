variable "aws_region" {
  description = "AWS region for the Terraform state bucket."
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Lowercase project identifier used in the state bucket name."
  type        = string
  default     = "taskflow"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "project_name may contain lowercase letters, digits, and hyphens only."
  }
}
