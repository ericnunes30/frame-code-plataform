#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

docker build -f "$ROOT_DIR/backend/docker/workspace/Dockerfile.ubuntu" \
  -t frame-code/workspace-ubuntu:latest \
  --build-arg "AGENT_RUNNER_REPO=${AGENT_RUNNER_REPO:-https://github.com/ericnunes30/agent-runner.git}" \
  --build-arg "AGENT_RUNNER_REF=${AGENT_RUNNER_REF:-v0.1.0}" \
  "$ROOT_DIR/backend/docker/workspace"

docker build -f "$ROOT_DIR/backend/docker/workspace/Dockerfile.node" \
  -t frame-code/workspace-node:latest \
  "$ROOT_DIR/backend/docker/workspace"

echo "Built workspace images:"
echo "- frame-code/workspace-ubuntu:latest"
echo "- frame-code/workspace-node:latest"
