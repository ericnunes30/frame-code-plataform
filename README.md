# Frame-Code-Platform

Sistema de workspace isolado por task com Docker, inspirado no OpenDevin/OpenHands e Devin 2.0.

## Visão Geral

O Frame-Code-Platform fornece isolamento completo de tarefas usando containers Docker, permitindo:

- **Isolamento Total**: Cada task em seu próprio ambiente
- **Persistência**: Retome trabalhos posteriormente
- **Segurança**: Sandboxing previne efeitos colaterais
- **Chat History**: Histórico de conversas persistente
- **Interação**: Tool `ask_user` para perguntas em tempo real

## Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd frame-code-plataform

# Instale as dependências
npm install

# Compile o projeto
npm run build

# (Opcional) Instale globalmente
npm link
```

## Pré-requisitos

- Node.js >= 18.0.0
- Docker instalado e rodando
- Windows/Linux/macOS

## Configuração Inicial

```bash
# Inicializa a configuração
frame-code init
```

Isso criará o arquivo `.code/workspace.config.json` com as configurações padrão.

## Uso

### Criar uma Task com Workspace Isolado

```bash
# Cria uma nova task com workspace isolado
frame-code task "Criar componente React" --workspace

# Especifica uma imagem Docker customizada
frame-code task "Build Python API" --workspace --image python:3.11-slim

# Retoma um workspace existente
frame-code task "Continuar desenvolvimento" --resume <workspace-id>
```

### Gerenciar Workspaces

```bash
# Lista todos os workspaces
frame-code workspace list

# Mostra detalhes de um workspace
frame-code workspace show <workspace-id>

# Para um workspace
frame-code workspace stop <workspace-id>

# Retoma um workspace pausado/parado
frame-code workspace resume <workspace-id>

# Executa um comando no workspace
frame-code workspace exec <workspace-id> "npm install"

# Mostra logs do workspace
frame-code workspace logs <workspace-id>

# Destroi um workspace
frame-code workspace destroy <workspace-id>

# Destroi todos os workspaces (cuidado!)
frame-code workspace purge
```

### Status do Sistema

```bash
# Mostra status do sistema
frame-code status
```

## Estrutura de Diretórios

```
frame-code-plataform/
├── src/
│   ├── platform/                    # Sistema de plataformas
│   │   ├── WorkspaceManager.ts      # Gerencia workspaces isolados
│   │   ├── DockerWorkspace.ts       # Implementação Docker
│   │   ├── SessionManager.ts        # Gerencia sessões com chat history
│   │   └── types.ts                 # Tipos da plataforma
│   ├── infrastructure/
│   │   └── tools/
│   │       └── AskUserTool.ts       # Tool para perguntar ao usuário
│   └── cli/
│       └── commands/
│           └── workspace.ts         # Comandos CLI
├── docker/
│   └── workspace/
│       └── Dockerfile.workspace     # Imagem base do workspace
├── .code/
│   └── workspace.config.json        # Configuração da plataforma
├── .workspaces/                     # Workspaces isolados
│   └── {workspace-id}/
│       ├── workspace/               # Arquivos montados no container
│       ├── session.json             # Estado da sessão
│       ├── chat-history.json        # Histórico de conversas
│       └── docker-state.json        # Estado do container
└── dist/                            # Output compilado
```

## Configuração

### `.code/workspace.config.json`

```json
{
  "defaultImage": "node:20-alpine",
  "workspaceBaseDir": ".workspaces",
  "autoCleanup": true,
  "sessionTimeout": 86400000,
  "maxConcurrentWorkspaces": 5,
  "docker": {
    "networkMode": "bridge",
    "portBindings": {},
    "volumeBindings": {
      ".": "/workspace"
    },
    "environment": {
      "NODE_ENV": "development"
    }
  },
  "persist": {
    "enabled": true,
    "path": ".workspaces",
    "compression": true
  }
}
```

## Desenvolvimento

```bash
# Modo desenvolvimento
npm run dev

# Watch mode
npm run watch

# Lint
npm run lint

# Testes
npm test
```

## Arquitetura

```
Task Request → WorkspaceManager → Docker Container (isolado)
                          ↓              ↓
                  SessionManager   Agent Execution
                          ↓              ↓
                  Chat History    ask_user Tool
                          ↓              ↓
                  Persistência ← Comunicação Bidirecional
```

## Componentes Principais

### WorkspaceManager
Gerencia o ciclo de vida dos workspaces isolados:
- Criar, iniciar, parar e destruir workspaces
- Executar comandos dentro do workspace
- Gerenciar persistência de estado

### DockerWorkspace
Gerencia containers Docker para isolamento:
- Criar e remover containers
- Executar comandos dentro do container
- Gerenciar volumes e redes

### SessionManager
Gerencia sessões de chat e estado:
- Histórico de mensagens persistente
- Recuperação de sessões existentes
- Suporte a tool calls

### AskUserTool
Permite que o agente faça perguntas ao usuário:
- Pausa execução do agente
- Coleta input do usuário
- Registra interação no chat history

## Roadmap

### MVP (Atual)
- [x] Criação de workspaces isolados
- [x] Gerenciamento de sessões com chat history
- [x] Tool `ask_user` para interação
- [x] CLI commands para gerenciamento

### Futuro
- [ ] Suporte a Docker Compose
- [ ] Redes isoladas customizáveis
- [ ] WebSocket para comunicação
- [ ] Monitoramento avançado e métricas
- [ ] Interface web

## Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

MIT

## Referências

- [OpenHands Agent Framework](https://www.emergentmind.com/topics/openhands-agent-framework)
- [Devin 2.0 Announcement](https://cognition.ai/blog/devin-2)
# frame-code-plataform
