$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "Building workspace images..."

$agentRunnerRepo = $env:AGENT_RUNNER_REPO
if (-not $agentRunnerRepo) { $agentRunnerRepo = "https://github.com/ericnunes30/agent-runner.git" }

$agentRunnerRef = $env:AGENT_RUNNER_REF
if (-not $agentRunnerRef) { $agentRunnerRef = "v0.1.0" }

docker build `
  -f (Join-Path $root "backend/docker/workspace/Dockerfile.ubuntu") `
  -t frame-code/workspace-ubuntu:latest `
  --build-arg "AGENT_RUNNER_REPO=$agentRunnerRepo" `
  --build-arg "AGENT_RUNNER_REF=$agentRunnerRef" `
  (Join-Path $root "backend/docker/workspace")
docker build -f (Join-Path $root "backend/docker/workspace/Dockerfile.node") -t frame-code/workspace-node:latest (Join-Path $root "backend/docker/workspace")

Write-Host "Built workspace images:"
Write-Host "- frame-code/workspace-ubuntu:latest"
Write-Host "- frame-code/workspace-node:latest"
