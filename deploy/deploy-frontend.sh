#!/usr/bin/env bash
set -euo pipefail

image=${1:?Frontend image is required}
domain=${2:?Production domain is required}
region=${3:?AWS region is required}
release_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
active_release=/opt/taskflow/frontend/active

[[ "$image" =~ ^[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com/taskflow-frontend@sha256:[a-f0-9]{64}$ ]]
[[ "$domain" =~ ^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*[a-z0-9]$ ]]
[[ "$region" =~ ^[a-z]{2}-[a-z]+-[0-9]$ ]]
docker network inspect taskflow_default >/dev/null
curl --fail --silent --show-error http://127.0.0.1:3000/health/ready >/dev/null

install -d -m 0750 "$(dirname "$active_release")"
exec 9>"${active_release}.lock"
flock 9
aws ecr get-login-password --region "$region" |
  docker login --username AWS --password-stdin "${image%%/*}" >/dev/null

compose() {
  local directory="$1"
  shift
  docker compose --project-name taskflow-web --env-file "$directory/frontend.env" \
    --file "$directory/compose.frontend.yaml" "$@"
}

printf 'TASKFLOW_FRONTEND_IMAGE=%s\nTASKFLOW_DOMAIN=%s\n' "$image" "$domain" > "$release_dir/frontend.env"
compose "$release_dir" pull frontend

rollback() {
  local status=$?
  if (( status != 0 )); then
    if [[ -f "$active_release" ]]; then
      compose "$(cat "$active_release")" up -d || echo 'Frontend rollback failed.' >&2
    else
      compose "$release_dir" rm --stop --force frontend || echo 'Failed to stop unverified frontend.' >&2
    fi
  fi
}
trap rollback EXIT

compose "$release_dir" up -d
request() {
  curl --fail --silent --show-error --max-time 5 --resolve "$domain:443:127.0.0.1" "https://$domain$1"
}
for attempt in $(seq 1 36); do
  if html="$(request /projects 2>/dev/null)" && grep -q 'id="root"' <<< "$html" &&
    ready="$(request /api/health/ready 2>/dev/null)" && grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' <<< "$ready"; then
    printf '%s\n' "$release_dir" > "${active_release}.tmp"
    mv -f "${active_release}.tmp" "$active_release"
    echo "Frontend and API proxy are ready at https://$domain"
    exit 0
  fi
  sleep 5
done
echo 'HTTPS or API readiness failed. Check domain DNS, port access and Caddy logs.' >&2
compose "$release_dir" logs --tail=30 frontend >&2
exit 1
