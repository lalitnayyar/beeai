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

echo "Starting BeeAI single-container deployment..."
"${DC[@]}" up --build -d

echo "Deployment is up."
echo "BeeAI Interface:      http://localhost:3000/beeai"
echo "Helpdesk Interface:   http://localhost:3000/helpdesk?role=operator"
echo "Customer Chat Portal: http://localhost:3000/customer"
echo "OTel Metrics:         http://localhost:9464/metrics"
