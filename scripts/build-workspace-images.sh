#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

docker build -f "$ROOT_DIR/backend/docker/workspace/Dockerfile.ubuntu" \
  -t frame-code/workspace-ubuntu:latest \
  --build-arg "CODE_RUNNER_REPO=${CODE_RUNNER_REPO:-${AGENT_RUNNER_REPO:-https://github.com/ericnunes30/code-runner.git}}" \
  --build-arg "CODE_RUNNER_REF=${CODE_RUNNER_REF:-${AGENT_RUNNER_REF:-v0.2.0}}" \
  "$ROOT_DIR/backend/docker/workspace"

docker build -f "$ROOT_DIR/backend/docker/workspace/Dockerfile.node" \
  -t frame-code/workspace-node:latest \
  "$ROOT_DIR/backend/docker/workspace"

echo "Built workspace images:"
echo "- frame-code/workspace-ubuntu:latest"
echo "- frame-code/workspace-node:latest"
