import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

export type AgentCommandEnvelope = {
  id: string;
  type: string;
  payload: JsonValue;
};

export type AgentEventEnvelope = {
  type: string;
  correlationId?: string;
  payload: JsonValue;
  timestamp: number;
};

export type RunnerClientOptions = {
  runnerDir: string;
  adapter: 'codex' | 'claude' | 'echo';
  repoPath: string;
  workspaceId: string;
  taskId: string;
  mcpAllowlist: JsonValue;
};

export class AgentRunnerClient extends EventEmitter {
  private child?: ChildProcessWithoutNullStreams;
  private closed = false;

  constructor(private readonly opts: RunnerClientOptions) {
    super();
  }

  async start(): Promise<void> {
    if (this.child) return;

    const entry = path.join(this.opts.runnerDir, 'dist', 'index.js');
    if (!existsSync(entry)) {
      throw new Error(
        `agent-runner entry not found: ${entry}. Build the runner first or point AGENT_RUNNER_DIR to a built checkout.`
      );
    }

    const child = spawn(process.execPath, [entry, '--mode', 'stdio', '--adapter', this.opts.adapter], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this.child = child;

    child.on('exit', (code, signal) => {
      this.closed = true;
      this.emit('exit', { code, signal });
    });

    child.on('error', err => {
      this.emit('error', err);
    });

    const stdoutRl = createInterface({ input: child.stdout, crlfDelay: Infinity });
    stdoutRl.on('line', line => this.handleStdoutLine(line));

    const stderrRl = createInterface({ input: child.stderr, crlfDelay: Infinity });
    stderrRl.on('line', line => {
      this.emit('event', {
        type: 'agent.log',
        timestamp: Date.now(),
        payload: { stream: 'stderr', text: line },
      } satisfies AgentEventEnvelope);
    });

    await this.send({
      id: crypto.randomUUID(),
      type: 'agent.session.start',
      payload: {
        taskId: this.opts.taskId,
        workspaceId: this.opts.workspaceId,
        repoPath: this.opts.repoPath,
        adapter: this.opts.adapter,
        mcpAllowlist: this.opts.mcpAllowlist,
      },
    });
  }

  async stop(reason?: string): Promise<void> {
    if (!this.child || this.closed) return;
    try {
      await this.send({
        id: crypto.randomUUID(),
        type: 'agent.session.stop',
        payload: reason ? { reason } : {},
      });
    } catch {
      // ignore
    }
    this.child.kill('SIGTERM');
    this.closed = true;
  }

  async send(cmd: AgentCommandEnvelope): Promise<void> {
    if (!this.child) throw new Error('agent-runner not started');
    if (this.closed) throw new Error('agent-runner already closed');
    this.child.stdin.write(`${JSON.stringify(cmd)}\n`);
  }

  private handleStdoutLine(line: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      this.emit('event', {
        type: 'agent.log',
        timestamp: Date.now(),
        payload: { stream: 'stdout', text: line },
      } satisfies AgentEventEnvelope);
      return;
    }

    if (!parsed || typeof parsed !== 'object') return;
    const evt = parsed as Partial<AgentEventEnvelope>;
    if (typeof evt.type !== 'string' || typeof evt.timestamp !== 'number') return;
    this.emit('event', evt as AgentEventEnvelope);
  }
}
