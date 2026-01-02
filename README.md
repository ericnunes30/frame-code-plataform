# Frame Code Platform

Plataforma para gerenciar **workspaces (projetos/repositórios)** e **tasks (chats) isoladas em containers Docker**.

## Estrutura (monorepo)

- `backend/`: API NestJS (orquestra workspaces/tasks e controla Docker)
- `frontend/`: UI React + Vite + Tailwind

## Desenvolvimento

Configuração:
- Por padrão, os dados ficam em `.workspace/` na raiz do repo.
- Para mudar o local, defina `WORKSPACE_BASE_DIR` (ex.: `/data/workspaces`).

Pré-requisitos:
- Node.js >= 18
- Docker (Docker Desktop no Windows ou Docker Engine no Linux)

Rodar local (host):

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000/api/v1`
- WebSocket: `ws://localhost:3000/ws`

## Integração com agentes (agent-runner)

O backend integra com o `agent-runner` via **stdio JSONL** (processo filho) quando recebe `chat.send`.

- Configure `AGENT_RUNNER_DIR` apontando para um checkout **buildado** do runner (precisa existir `dist/index.js`).
- Configure `DEFAULT_AGENT_ADAPTER` (`echo` por padrão).

## Docker (API + UI)

```bash
docker compose up --build
```

Observações:
- O `backend` monta o socket do Docker (`/var/run/docker.sock`) para conseguir criar/parar containers de tasks.

## Imagens de workspace/task

Dockerfiles disponíveis em `backend/docker/workspace/`:
- `Dockerfile.ubuntu`: Ubuntu 22.04 com git + Node 20 (base recomendada para rodar o agente dentro do container)
- `Dockerfile.node`: Node Alpine (legado/alternativa)

Antes de criar tasks (containers), construa a imagem base do workspace:

Linux/macOS:
```bash
./scripts/build-workspace-images.sh
```

Windows PowerShell:
```powershell
.\scripts\build-workspace-images.ps1
```
