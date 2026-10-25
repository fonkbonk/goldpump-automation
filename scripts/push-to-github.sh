#!/usr/bin/env bash
# Push main to https://github.com/primary-yk/goldpump-automation
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -z "${GITHUB_TOKEN:-}" && -f deploy/github-push.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source deploy/github-push.env
  set +a
fi
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Set GITHUB_TOKEN or add deploy/github-push.env, then re-run."
  exit 1
fi
REMOTE="https://x-access-token:${GITHUB_TOKEN}@github.com/primary-yk/goldpump-automation.git"
git push "$REMOTE" main:main
echo "OK — on VPS: cd /opt/goldpump-automation && git pull origin main && npm install && npm run build"
