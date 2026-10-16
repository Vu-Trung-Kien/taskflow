# TaskFlow AWS foundation

This Terraform root provisions a single-host foundation in `ap-southeast-1`:

- Amazon Linux 2023 EC2 with Docker, SSM access, IMDSv2 required, and public
  ingress only on ports 80 and 443. There is no SSH rule; PostgreSQL and the API
  container port are not exposed by the security group.
- A separate encrypted gp3 EBS volume mounted at
  `/var/lib/taskflow/postgres`, with `prevent_destroy` enabled. The deployment
  Compose configuration must use a PostgreSQL image with UID 999 (for example,
  `postgres:16-bookworm`) for that bind mount.
- Immutable ECR image tags and a lifecycle policy retaining the ten latest
  images.
- Separate private S3 buckets for attachments and PostgreSQL backups, with
  encryption, versioning, TLS-only bucket policies, browser CORS for
  presigned attachments, and configurable backup retention (35 days by
  default).
- GitHub Actions OIDC trust restricted to the configured repository's `main`
  branch. EC2 receives an instance profile for SSM, ECR pulls, S3 object access,
  and production SSM Parameter Store values.

## Apply safely

1. Bootstrap the state bucket using [infra/bootstrap](../bootstrap/README.md).
2. Copy `backend.hcl.example` to the ignored `backend.hcl` and set the real,
   account-specific state bucket name.
3. Initialize, validate, and inspect a plan:

   ```bash
   terraform -chdir=infra/terraform init -backend-config=backend.hcl
   terraform -chdir=infra/terraform fmt -check -recursive
   terraform -chdir=infra/terraform validate
   terraform -chdir=infra/terraform plan
   ```

4. Set reviewed values through an ignored `terraform.tfvars` file if defaults
   are not appropriate. Confirm default VPC/subnets exist and review estimated
   costs for EC2, public IPv4, EBS, S3 and data transfer before applying.
5. Apply only after reviewing the exact plan:

   ```bash
   terraform -chdir=infra/terraform apply
   ```

Never put secret values in `.tfvars`, user data, GitHub workflow files, or
Terraform-managed resources. Store runtime secrets as SSM Parameter Store
`SecureString` values under `/<project>/production/`; the instance role can
read these values. The parameter values themselves must be provisioned through
a secure operator workflow, not committed or stored in Terraform state.

## Current boundaries

- Terraform plans and CI validation do not prove resources were applied.
- This root does not deploy the application, create public DNS records, install
  a certificate, schedule backups, or configure Prometheus/Grafana. Those are
  separate CD/operations milestones.
- Public HTTPS requires a domain and DNS target. Domain availability is not
  decided yet.
- PostgreSQL remains a Docker container on the attached EBS volume; no RDS
  resource is created.
