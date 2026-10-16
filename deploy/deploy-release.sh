#!/usr/bin/env bash
set -Eeuo pipefail

readonly COMPOSE_VERSION="v2.39.4"
readonly COMPOSE_SHA256="7af95166a730b87e172d4fc9aefea8725d3c6c7327d59149267b452114ddb7d4"
readonly PARAMETER_PREFIX="/taskflow/production"
readonly INSTALL_ROOT="/opt/taskflow"
readonly CONFIG_ROOT="/etc/taskflow"
readonly DATA_ROOT="/var/lib/taskflow/postgres"

if [[ $# -ne 3 ]]; then
  echo "Usage: deploy-release.sh <40-character-image-sha> <ecr-repository-uri> <aws-region>" >&2
  exit 2
fi

IMAGE_TAG="$1"
ECR_REPOSITORY="$2"
AWS_REGION="$3"
RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${RELEASE_DIR}/compose.production.yaml"
RUNTIME_ENV="${CONFIG_ROOT}/runtime.env"

if [[ ! "$IMAGE_TAG" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Image tag must be a full lowercase Git commit SHA." >&2
  exit 2
fi
if [[ ! "$ECR_REPOSITORY" =~ ^[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com/taskflow-api$ ]]; then
  echo "Unexpected ECR repository URI." >&2
  exit 2
fi
if [[ ! "$AWS_REGION" =~ ^[a-z]{2}(-gov)?-[a-z]+-[0-9]$ ]]; then
  echo "Unexpected AWS region." >&2
  exit 2
fi
if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Production Compose file is missing: ${COMPOSE_FILE}" >&2
  exit 1
fi

install -d -m 0750 "$INSTALL_ROOT" "$CONFIG_ROOT"
if ! mountpoint -q "$DATA_ROOT"; then
  echo "PostgreSQL EBS volume is not mounted at ${DATA_ROOT}." >&2
  exit 1
fi
install -d -o 999 -g 999 -m 0700 "${DATA_ROOT}/data"

if ! docker compose version >/dev/null 2>&1; then
  command -v curl >/dev/null 2>&1 || {
    echo "curl is required to install the pinned Docker Compose plugin." >&2
    exit 1
  }
  compose_tmp="$(mktemp)"
  trap 'rm -f "$compose_tmp"' EXIT
  curl --fail --location --silent --show-error \
    "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
    --output "$compose_tmp"
  printf '%s  %s\n' "$COMPOSE_SHA256" "$compose_tmp" | sha256sum --check --status || {
    echo "Docker Compose binary checksum verification failed." >&2
    exit 1
  }
  install -D -m 0755 "$compose_tmp" /usr/local/lib/docker/cli-plugins/docker-compose
  rm -f "$compose_tmp"
  trap - EXIT
fi

command -v aws >/dev/null 2>&1 || {
  echo "AWS CLI is required on the EC2 instance." >&2
  exit 1
}
command -v curl >/dev/null 2>&1 || {
  echo "curl is required for post-deployment health checks." >&2
  exit 1
}

get_parameter() {
  aws ssm get-parameter \
    --name "${PARAMETER_PREFIX}/$1" \
    --with-decryption \
    --query Parameter.Value \
    --output text \
    --region "$AWS_REGION"
}

POSTGRES_USER="$(get_parameter postgres-user)"
POSTGRES_PASSWORD="$(get_parameter postgres-password)"
POSTGRES_DB="$(get_parameter postgres-db)"

if [[ ! "$POSTGRES_USER" =~ ^[A-Za-z0-9_]{1,63}$ ]]; then
  echo "SSM postgres-user must contain 1-63 ASCII letters, digits, or underscores." >&2
  exit 1
fi
if [[ ! "$POSTGRES_DB" =~ ^[A-Za-z0-9_]{1,63}$ ]]; then
  echo "SSM postgres-db must contain 1-63 ASCII letters, digits, or underscores." >&2
  exit 1
fi
if [[ ! "$POSTGRES_PASSWORD" =~ ^[A-Za-z0-9_-]{32,}$ ]]; then
  echo "SSM postgres-password must be at least 32 URL-safe ASCII characters." >&2
  exit 1
fi

readonly REGISTRY="${ECR_REPOSITORY%%/*}"
aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "$REGISTRY" >/dev/null

previous_env="$(mktemp)"
had_previous_env=0
api_update_started=0
previous_tag=""
if [[ -f "$RUNTIME_ENV" ]]; then
  cp "$RUNTIME_ENV" "$previous_env"
  had_previous_env=1
  previous_tag="$(sed -n 's/^IMAGE_TAG=//p' "$RUNTIME_ENV")"
fi

restore_previous_release() {
  local status=$?
  trap - EXIT
  if (( status != 0 )); then
    echo "Deployment failed; restoring the previous application image where possible." >&2
    if (( had_previous_env )); then
      install -m 0600 "$previous_env" "$RUNTIME_ENV"
      if (( api_update_started )) && [[ "$previous_tag" =~ ^[0-9a-f]{40}$ ]]; then
        if ! docker compose --project-name taskflow --env-file "$RUNTIME_ENV" \
          --file "$COMPOSE_FILE" up --detach --no-deps api; then
          echo "Automatic API rollback failed; inspect the taskflow Compose project on the instance." >&2
        fi
      fi
    else
      if (( api_update_started )); then
        if ! docker compose --project-name taskflow --env-file "$RUNTIME_ENV" \
          --file "$COMPOSE_FILE" \
          rm --stop --force api >/dev/null 2>&1; then
          echo "Could not stop the unverified API container after the first deployment failed." >&2
        fi
      fi
      rm -f "$RUNTIME_ENV"
    fi
  fi
  rm -f "$previous_env"
  exit "$status"
}
trap restore_previous_release EXIT

runtime_env_tmp="$(mktemp "${CONFIG_ROOT}/runtime.env.XXXXXX")"
{
  printf 'POSTGRES_USER=%s\n' "$POSTGRES_USER"
  printf 'POSTGRES_PASSWORD=%s\n' "$POSTGRES_PASSWORD"
  printf 'POSTGRES_DB=%s\n' "$POSTGRES_DB"
  printf 'DATABASE_URL=postgresql://%s:%s@postgres:5432/%s?schema=public\n' \
    "$POSTGRES_USER" "$POSTGRES_PASSWORD" "$POSTGRES_DB"
  printf 'ECR_REPOSITORY=%s\n' "$ECR_REPOSITORY"
  printf 'IMAGE_TAG=%s\n' "$IMAGE_TAG"
} >"$runtime_env_tmp"
chmod 0600 "$runtime_env_tmp"
mv -f "$runtime_env_tmp" "$RUNTIME_ENV"

compose() {
  docker compose \
    --project-name taskflow \
    --env-file "$RUNTIME_ENV" \
    --file "$COMPOSE_FILE" \
    "$@"
}

compose pull postgres api migrator
compose up --detach postgres

postgres_container="$(compose ps --quiet postgres)"
if [[ -z "$postgres_container" ]]; then
  echo "PostgreSQL container was not created." >&2
  exit 1
fi
for attempt in $(seq 1 60); do
  postgres_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$postgres_container")"
  if [[ "$postgres_health" == "healthy" ]]; then
    break
  fi
  if [[ "$postgres_health" == "unhealthy" || "$postgres_health" == "missing" ]]; then
    echo "PostgreSQL did not become healthy (status: ${postgres_health})." >&2
    exit 1
  fi
  if (( attempt == 60 )); then
    echo "Timed out waiting for PostgreSQL to become healthy." >&2
    exit 1
  fi
  sleep 5
done

compose run --rm migrator

api_update_started=1
compose up --detach --no-deps api
for attempt in $(seq 1 60); do
  if curl --fail --silent --show-error http://127.0.0.1:3000/health/ready >/dev/null 2>&1; then
    version_response="$(curl --fail --silent --show-error http://127.0.0.1:3000/version)"
    if grep --extended-regexp --quiet \
      '"gitSha"[[:space:]]*:[[:space:]]*"'"$IMAGE_TAG"'"' <<<"$version_response"; then
      echo "Deployment verified: /health/ready is healthy and /version reports ${IMAGE_TAG}."
      exit 0
    fi
    echo "API is ready, but /version did not report the requested image SHA." >&2
    exit 1
  fi
  if (( attempt == 60 )); then
    echo "Timed out waiting for API /health/ready." >&2
    exit 1
  fi
  sleep 5
done
