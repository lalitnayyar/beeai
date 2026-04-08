#!/usr/bin/env bash
set -euo pipefail

if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  echo "Error: Docker Compose not found. Install Docker Compose plugin or docker-compose."
  exit 1
fi

echo "Stopping BeeAI deployment..."
"${DC[@]}" down
echo "Deployment stopped."
