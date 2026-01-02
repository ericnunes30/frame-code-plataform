#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

docker build -f "$ROOT_DIR/backend/docker/workspace/Dockerfile.ubuntu" \
  -t frame-code/workspace-ubuntu:latest \
  "$ROOT_DIR/backend/docker/workspace"

docker build -f "$ROOT_DIR/backend/docker/workspace/Dockerfile.node" \
  -t frame-code/workspace-node:latest \
  "$ROOT_DIR/backend/docker/workspace"

echo "Built workspace images:"
echo "- frame-code/workspace-ubuntu:latest"
echo "- frame-code/workspace-node:latest"
