# Terraform state bootstrap

This separate Terraform root creates the remote-state bucket once. It uses local
state until the S3 bucket exists. Authenticate with the `taskflow` AWS profile
or another explicitly selected AWS identity; do not use root credentials.

```bash
terraform -chdir=infra/bootstrap init
terraform -chdir=infra/bootstrap validate
terraform -chdir=infra/bootstrap plan
terraform -chdir=infra/bootstrap apply
terraform -chdir=infra/bootstrap output -raw state_bucket_name
```

The bucket is account-scoped, versioned, encrypted, blocked from public access,
and denies non-TLS requests. Keep the local bootstrap state file private and
back it up securely; never commit it.

After bootstrap, copy `infra/terraform/backend.hcl.example` to the ignored
`infra/terraform/backend.hcl`, replace the account ID in `bucket`, then run:

```bash
terraform -chdir=infra/terraform init \
  -backend-config=backend.hcl
```

The production root uses S3 lockfiles (`use_lockfile = true`) and requires
Terraform 1.10 or newer. Review the plan carefully before applying because it
creates billable AWS resources. No AWS resources are created by `validate` or
`plan`.
