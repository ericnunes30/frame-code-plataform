$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "Building workspace images..."

$codeRunnerRepo = $env:CODE_RUNNER_REPO
if (-not $codeRunnerRepo) { $codeRunnerRepo = $env:AGENT_RUNNER_REPO }
if (-not $codeRunnerRepo) { $codeRunnerRepo = "https://github.com/ericnunes30/agent-runner.git" }

$codeRunnerRef = $env:CODE_RUNNER_REF
if (-not $codeRunnerRef) { $codeRunnerRef = $env:AGENT_RUNNER_REF }
if (-not $codeRunnerRef) { $codeRunnerRef = "v0.2.0" }

docker build `
  -f (Join-Path $root "backend/docker/workspace/Dockerfile.ubuntu") `
  -t frame-code/workspace-ubuntu:latest `
  --build-arg "CODE_RUNNER_REPO=$codeRunnerRepo" `
  --build-arg "CODE_RUNNER_REF=$codeRunnerRef" `
  (Join-Path $root "backend/docker/workspace")
docker build -f (Join-Path $root "backend/docker/workspace/Dockerfile.node") -t frame-code/workspace-node:latest (Join-Path $root "backend/docker/workspace")

Write-Host "Built workspace images:"
Write-Host "- frame-code/workspace-ubuntu:latest"
Write-Host "- frame-code/workspace-node:latest"
