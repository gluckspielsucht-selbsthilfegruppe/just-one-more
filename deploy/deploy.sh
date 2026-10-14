#!/bin/sh
# Deploys one image tag and rolls back if the new container does not become healthy.
# Usage: ./deploy.sh <sha-xxxxxxx|latest>
# CI calls it through a forced SSH command, so the tag may also arrive in SSH_ORIGINAL_COMMAND.
set -eu

tag="${1:-${SSH_ORIGINAL_COMMAND:-}}"
usage() {
  echo "Usage: deploy.sh <sha-xxxxxxx|latest>" >&2
  exit 2
}
case "$tag" in *"
"*) usage ;; esac
printf '%s' "$tag" | grep -Eqx 'sha-[0-9a-f]{7,40}|latest' || usage

cd "$(dirname "$0")"
previous=$(sed -n 's/^IMAGE_TAG=//p' .env)

set_tag() {
  if grep -q '^IMAGE_TAG=' .env; then
    sed -i.bak "s/^IMAGE_TAG=.*/IMAGE_TAG=$1/" .env && rm -f .env.bak
  else
    echo "IMAGE_TAG=$1" >>.env
  fi
}

IMAGE_TAG="$tag" docker compose pull app
set_tag "$tag"
if docker compose up -d --wait --wait-timeout 120 app; then
  docker image prune -f >/dev/null
  echo "Deployed $tag (previous: ${previous:-none})"
  exit 0
fi

echo "$tag did not become healthy; rolling back to ${previous:-none}" >&2
docker compose logs --tail 50 app >&2 || true
if [ -n "$previous" ]; then
  set_tag "$previous"
  docker compose up -d --wait --wait-timeout 120 app
fi
exit 1
