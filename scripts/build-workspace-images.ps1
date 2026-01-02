$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "Building workspace images..."

docker build -f (Join-Path $root "backend/docker/workspace/Dockerfile.ubuntu") -t frame-code/workspace-ubuntu:latest (Join-Path $root "backend/docker/workspace")
docker build -f (Join-Path $root "backend/docker/workspace/Dockerfile.node") -t frame-code/workspace-node:latest (Join-Path $root "backend/docker/workspace")

Write-Host "Built workspace images:"
Write-Host "- frame-code/workspace-ubuntu:latest"
Write-Host "- frame-code/workspace-node:latest"
