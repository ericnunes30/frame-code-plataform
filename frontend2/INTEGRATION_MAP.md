# Mapa de Integração (origem: `frontend/` → alvo: `frontend2/`)

Objetivo: mapear **todas as integrações reais** existentes entre `frontend/` e `backend/` (HTTP + Socket.IO) para portar para `frontend2/`.

## Base URLs e Proxy

- **HTTP base**: `GET/POST/... /api/v1/*` (prefix global no backend).
  - Backend: `app.setGlobalPrefix('api/v1')` em `backend/src/main.ts`.
  - Frontend: `API_BASE_URL = '/api/v1'` em `frontend/src/services/api.ts`.
- **Socket.IO**: `path: '/ws'`.
  - Backend gateways: `@WebSocketGateway({ path: '/ws' })` em `backend/src/modules/websockets/*`.
  - Frontend client: `WS_PATH = '/ws'` em `frontend/src/services/websocket.ts`.
- **Dev proxy no `frontend/` (Vite)**: `vite.config.ts` faz proxy de:
  - `/api` → `http://localhost:3000`
  - `/ws` → `ws://localhost:3000`

Para o `frontend2/` (Vite), o proxy de dev é equivalente ao `frontend/`: `/api/*` e `/ws/*` são encaminhados para o backend (configurado em `VITE_BACKEND_URL`).

## Modelos (tipos)

Os tipos do `frontend/` em `frontend/src/services/types.ts` batem com os modelos do backend em `backend/src/platform/models.ts` / `backend/src/platform/types.ts`.

### Workspace

- `Workspace`: `{ id, name, repoUrl?, defaultBranch?, createdAt, updatedAt }`
- Create: `{ name, repoUrl?, defaultBranch? }` (`CreateWorkspaceDto`)

### Task

- `Task`: `{ taskId, workspaceId, title, status, containerId?, image, repoPath, branch?, createdAt, updatedAt, lastActivityAt }`
- Status: `'creating' | 'running' | 'stopped' | 'error'`
- Create: `{ title, branch? }` (`CreateTaskDto`)

### Chat / Mensagens

- `Chat`: `{ chatId, workspaceId, title, createdAt, updatedAt, lastActivityAt, messageCount, taskId? }`
- `SessionMessage`: `{ id, role: 'user'|'agent'|'system', content, timestamp, ... }`

Observação importante do backend: **chat == task** (criar chat provisiona task/container).

## HTTP Endpoints usados pelo `frontend/`

Prefixo em todas as rotas: `/api/v1` (no frontend isso é embutido em `API_BASE_URL`).

### Workspaces

- `GET /workspaces` → `Workspace[]`
  - Frontend: `useWorkspaces` (`frontend/src/hooks/useWorkspaces.ts`)
  - Backend: `WorkspacesController.findAll` (`backend/src/modules/workspaces/workspaces.controller.ts`)
- `GET /workspaces/:id` → `Workspace`
  - Frontend: `useWorkspace` (`frontend/src/hooks/useWorkspace.ts`)
  - Backend: `WorkspacesController.findOne`
- `POST /workspaces` body `{ name, repoUrl?, defaultBranch? }` → `Workspace`
  - Frontend: `Dashboard` + `Workspaces` (`frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Workspaces.tsx`)
  - Backend: `WorkspacesController.create` + `CreateWorkspaceDto`
- `DELETE /workspaces/:id` → `{ success: true }`
  - Frontend: `useWorkspace.destroy` (`frontend/src/hooks/useWorkspace.ts`)
  - Backend: `WorkspacesController.remove`

### Tasks

- `GET /tasks` → `Task[]`
  - Frontend: `useTasks` (`frontend/src/hooks/useTasks.ts`)
  - Backend: `TasksController.listAll` (`backend/src/modules/tasks/tasks.controller.ts`)
- `POST /tasks/:taskId/start` → `Task` (ou status equivalente)
  - Frontend: `Dashboard.handleStartWorkspace` (`frontend/src/pages/Dashboard.tsx`)
  - Backend: `TasksController.start`
- `POST /tasks/:taskId/stop` → `Task` (ou status equivalente)
  - Frontend: `Dashboard.handleStopWorkspace` (`frontend/src/pages/Dashboard.tsx`)
  - Backend: `TasksController.stop`

Rotas **existentes no backend** mas **não usadas** pelo `frontend/` hoje:

- `GET /workspaces/:workspaceId/tasks`
- `POST /workspaces/:workspaceId/tasks` body `{ title, branch? }`
- `GET /tasks/:taskId`
- `DELETE /tasks/:taskId`
- `GET /tasks/:taskId/logs?tail=100` → `{ logs: string }` (o `frontend/` usa WS para logs)

### System

- `GET /system/status` → `{ docker, tasks, cpu, memory }`
  - Frontend: `useSystemStats` (`frontend/src/hooks/useSystemStats.ts`)
  - Backend: `SystemController.getStatus` (`backend/src/modules/system/system.controller.ts`)

Rota **existente no backend** mas **não usada** pelo `frontend/` hoje:

- `DELETE /system/purge` → `{ count, message }`

### Chats

- `GET /chats/workspace/:workspaceId` → `Chat[]`
  - Frontend: `useChats` (`frontend/src/hooks/useChats.ts`)
  - Backend: `ChatsController.listChats`
- `POST /chats/workspace/:workspaceId` body `{ title? }` → `Chat`
  - Frontend: `useChats.createChat` + `Dashboard.ensureTaskThenOpen` (`frontend/src/hooks/useChats.ts`, `frontend/src/pages/Dashboard.tsx`)
  - Backend: `ChatsController.createChat` + `CreateChatDto`
- `GET /chats/:chatId/messages` → `SessionMessage[]`
  - Frontend: `useChat` (`frontend/src/hooks/useChat.ts`)
  - Backend: `ChatsController.getMessages`
- `PUT /chats/:chatId/title` body `{ title }` → `{ success: true }`
  - Frontend: `useChats.updateChatTitle`
  - Backend: `ChatsController.updateTitle` + `UpdateChatTitleDto`
- `DELETE /chats/:chatId` → `{ success: true }`
  - Frontend: `useChats.deleteChat`
  - Backend: `ChatsController.deleteChat`

Rota **existente no backend** mas **não usada** pelo `frontend/` hoje:

- `POST /chats/:chatId/messages` body `{ content }` → `SessionMessage` (o `frontend/` envia via WS `chat.send`)

## Socket.IO (eventos usados pelo `frontend/`)

Path: `/ws`.

### Conexão / gerais

- `connect`, `disconnect`, `connect_error`, `error` (encaminhados por `frontend/src/services/websocket.ts`).

### Chat (Gateway: `ChatGateway`)

**Client → Server**

- `subscribe` payload `{ channel: 'chat', workspaceId, chatId? }`
- `unsubscribe` payload `{ channel: 'chat', workspaceId, chatId? }`
- `chat.send` payload `{ workspaceId, chatId, content }`

**Server → Client**

- `subscribed` payload `{ channel, workspaceId, chatId? }`
- `chat.message` payload `{ type: 'chat.message', workspaceId, chatId, message: SessionMessage }`

Observação: o `frontend/` escuta `chat.typing`, porém **não existe emissão** de `chat.typing` no backend hoje (apenas `chat.message`).

### Logs (Gateway: `LogsGateway`)

**Client → Server**

- `logs.follow` payload `{ taskId, tail? }`
- `logs.unfollow` payload `{ taskId }`

**Server → Client**

- `subscribed` payload `{ channel: 'logs', taskId }`
- `logs.data` payload `{ taskId, logs?: string, log?: string, timestamp }`
- `logs.error` payload `{ taskId, error }`

## Tradução para as telas do `frontend2/` (o que precisa integrar)

- `Dashboard`:
  - HTTP: `GET /system/status`, `GET /workspaces`, `GET /tasks`
  - Ações: `POST /workspaces`, `DELETE /workspaces/:id`, `POST /tasks/:taskId/start`, `POST /tasks/:taskId/stop`, `POST /chats/workspace/:workspaceId`
- `Workspaces list (/workspaces)`:
  - HTTP: `GET /workspaces`, `POST /workspaces`
- `Workspace Details (/workspaces/:id?chat=<chatId>)`:
  - HTTP: `GET /workspaces/:id`, `GET /chats/workspace/:id`, `GET /chats/:chatId/messages`
  - WS: `subscribe/unsubscribe`, `chat.send`, `chat.message`, `logs.follow/unfollow`, `logs.data`
- `Settings` (MVP recomendado):
  - HTTP: `GET /system/status`, `DELETE /system/purge`
  - Gap do design: expor `WORKSPACE_BASE_DIR` efetivo (não existe no `GET /system/status` hoje).

## Gaps / divergências que afetam o port para `frontend2/`

- `chat.typing` não é emitido pelo backend (frontend atual escuta, mas não receberá).
- `Settings` do design pede “WORKSPACE_BASE_DIR efetivo”; backend não expõe isso em endpoint hoje (exigir endpoint novo ou estender `/system/status`).
