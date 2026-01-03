/**
 * Gerenciador de containers Docker para isolamento de workspaces
 */

import Docker from 'dockerode';
import { promises as fs } from 'fs';
import path from 'path';
import { PassThrough } from 'stream';
import {
  DockerConfig,
  WorkspaceConfig,
  ExecutionResult,
  DockerError,
} from './types';

export class DockerWorkspace {
  private docker: Docker;
  constructor() {
    const socketPath =
      process.env.DOCKER_SOCKET ||
      (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock');

    this.docker = new Docker({ socketPath });
  }

  private isNoSuchContainerError(error: unknown): boolean {
    const anyErr = error as any;
    const message = (anyErr?.message ?? String(error ?? '')).toString().toLowerCase();
    const statusCode = anyErr?.statusCode ?? anyErr?.status;
    return statusCode === 404 || message.includes('no such container');
  }

  /**
   * Verifica se o Docker estÃ¡ disponÃ­vel
   */
  async isDockerAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  async getVersion(): Promise<string | null> {
    try {
      const version = await this.docker.version();
      return version.Version;
    } catch {
      return null;
    }
  }

  /**
   * Verifica se uma imagem existe localmente
   */
  private async imageExists(imageName: string): Promise<boolean> {
    try {
      const images = await this.docker.listImages();
      return images.some((img) =>
        img.RepoTags?.some((tag) => tag === imageName || tag === `${imageName}:latest`)
      );
    } catch {
      return false;
    }
  }

  /**
   * Pull de uma imagem Docker
   */
  private async pullImage(imageName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) {
          reject(new DockerError(`Failed to pull image ${imageName}: ${err.message}`, 'PULL_FAILED'));
          return;
        }

        this.docker.modem.followProgress(stream, (err) => {
          if (err) {
            reject(new DockerError(`Failed to pull image ${imageName}: ${err.message}`, 'PULL_FAILED'));
          } else {
            resolve();
          }
        });
      });
    });
  }

  /**
   * Garante que a imagem existe, fazendo pull se necessÃ¡rio
   */
  private async ensureImage(imageName: string): Promise<void> {
    if (!(await this.imageExists(imageName))) {
      console.log(`Image ${imageName} not found locally, pulling...`);
      await this.pullImage(imageName);
    }
  }

  /**
   * Cria um container Docker para o workspace
   */
  async createContainer(
    workspaceConfig: WorkspaceConfig,
    dockerConfig: DockerConfig
  ): Promise<string> {
    try {
      // Verifica se Docker estÃ¡ disponÃ­vel
      if (!(await this.isDockerAvailable())) {
        throw new DockerError('Docker is not available', 'DOCKER_UNAVAILABLE');
      }

      // Garante que a imagem existe
      await this.ensureImage(dockerConfig.image);

      // Cria diretÃ³rio de montagem se nÃ£o existir
      await fs.mkdir(workspaceConfig.mountPath, { recursive: true });

      // Prepara volumes
      const volumes: Record<string, {}> = {};
      const binds: string[] = [];

      if (dockerConfig.volumeBindings) {
        for (const [hostPath, containerPath] of Object.entries(dockerConfig.volumeBindings)) {
          const resolvedHostPath = path.resolve(hostPath);
          volumes[containerPath] = {};
          binds.push(`${resolvedHostPath}:${containerPath}`);
        }
      }

      // Prepara variÃ¡veis de ambiente
      const envVars = dockerConfig.environment
        ? Object.entries(dockerConfig.environment).map(([k, v]) => `${k}=${v}`)
        : [];

      // Cria o container
      const containerConfig: Docker.ContainerCreateOptions = {
        name: `workspace-${workspaceConfig.id}`,
        Image: dockerConfig.image,
        Env: envVars,
        HostConfig: {
          Binds: binds,
          PortBindings: dockerConfig.portBindings,
          NetworkMode: dockerConfig.networkMode || 'bridge',
          AutoRemove: false,
        },
        Cmd: ['/bin/sh', '-c', 'tail -f /dev/null'],
        WorkingDir: '/workspace',
      };

      const container = await this.docker.createContainer(containerConfig);
      await container.start();

      return container.id;
    } catch (error) {
      if (error instanceof DockerError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new DockerError(`Failed to create container: ${message}`, 'CREATE_FAILED', workspaceConfig.id);
    }
  }

  /**
   * Inicia um container existente
   */
  async startContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.start();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new DockerError(`Failed to start container ${containerId}: ${message}`, 'START_FAILED', containerId);
    }
  }

  /**
   * Para um container
   */
  async stopContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: 10 }); // Timeout de 10 segundos
    } catch (error) {
      if (this.isNoSuchContainerError(error)) return;
      const message = error instanceof Error ? error.message : String(error);
      throw new DockerError(`Failed to stop container ${containerId}: ${message}`, 'STOP_FAILED', containerId);
    }
  }

  /**
   * Pausa um container
   */
  async pauseContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.pause();
    } catch (error) {
      if (this.isNoSuchContainerError(error)) return;
      const message = error instanceof Error ? error.message : String(error);
      throw new DockerError(`Failed to pause container ${containerId}: ${message}`, 'PAUSE_FAILED', containerId);
    }
  }

  /**
   * Retoma um container pausado
   */
  async unpauseContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.unpause();
    } catch (error) {
      if (this.isNoSuchContainerError(error)) return;
      const message = error instanceof Error ? error.message : String(error);
      throw new DockerError(`Failed to unpause container ${containerId}: ${message}`, 'UNPAUSE_FAILED', containerId);
    }
  }

  /**
   * Executa um comando dentro do container
   */
  async execCommand(
    containerId: string,
    command: string[],
    options: { workDir?: string; env?: Record<string, string>; timeout?: number } = {}
  ): Promise<ExecutionResult> {
    try {
      const container = this.docker.getContainer(containerId);

      const execConfig: Docker.ExecCreateOptions = {
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: options.workDir || '/workspace',
        Env: options.env ? Object.entries(options.env).map(([k, v]) => `${k}=${v}`) : undefined,
      };

      const exec = await container.exec(execConfig);

      return new Promise((resolve, reject) => {
        let timeoutHandle: NodeJS.Timeout | undefined;

        exec.start({ Detach: false }, (err, stream) => {
          if (err) {
            reject(new DockerError(`Exec failed: ${err.message}`, 'EXEC_FAILED', containerId));
            return;
          }

          if (!stream) {
            reject(new DockerError('No stream returned', 'NO_STREAM', containerId));
            return;
          }

          let stdout = '';
          let stderr = '';

          const stdoutStream = new PassThrough();
          const stderrStream = new PassThrough();

          this.docker.modem.demuxStream(stream as any, stdoutStream, stderrStream);

          stdoutStream.on('data', (chunk: Buffer) => {
            stdout += chunk.toString('utf-8');
          });

          stderrStream.on('data', (chunk: Buffer) => {
            stderr += chunk.toString('utf-8');
          });

          stream.on('error', (err: Error) => {
            reject(new DockerError(`Stream error: ${err.message}`, 'STREAM_ERROR', containerId));
          });

          stream.on('end', async () => {
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
            }
            try {
              const info = await exec.inspect();
              resolve({
                stdout,
                stderr,
                exitCode: info.ExitCode || 0,
                timestamp: new Date(),
              });
            } catch (inspectError) {
              reject(new DockerError('Failed to inspect exec', 'INSPECT_FAILED', containerId));
            }
          });

          // Timeout opcional
          if (options.timeout) {
            timeoutHandle = setTimeout(() => {
              stream.destroy();
              reject(new DockerError(`Command timeout after ${options.timeout}ms`, 'TIMEOUT', containerId));
            }, options.timeout);
          }
        });
      });
    } catch (error) {
      if (error instanceof DockerError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new DockerError(`Failed to execute command: ${message}`, 'EXEC_FAILED', containerId);
    }
  }

  /**
   * ObtÃ©m logs do container
   */
  async getLogs(containerId: string, tail: number = 100): Promise<string> {
    try {
      const container = this.docker.getContainer(containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      });
      const buf = Buffer.isBuffer(logs) ? logs : Buffer.from(logs as any);
      return this.demuxDockerLogsBuffer(buf).toString('utf-8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new DockerError(`Failed to get logs: ${message}`, 'LOGS_FAILED', containerId);
    }
  }

  private demuxDockerLogsBuffer(buf: Buffer): Buffer {
    // Docker multiplexed stream format:
    // [0]=streamType(1=stdout,2=stderr), [1..3]=0, [4..7]=uint32be length, then <length> bytes payload.
    if (buf.length < 8) return buf;

    const chunks: Buffer[] = [];
    let offset = 0;

    while (offset + 8 <= buf.length) {
      const streamType = buf[offset];
      const b1 = buf[offset + 1];
      const b2 = buf[offset + 2];
      const b3 = buf[offset + 3];

      // Heuristic: if header doesn't match expected format, treat as plain text.
      if ((streamType !== 1 && streamType !== 2) || b1 !== 0 || b2 !== 0 || b3 !== 0) {
        return buf;
      }

      const size = buf.readUInt32BE(offset + 4);
      const start = offset + 8;
      const end = start + size;
      if (end > buf.length) break;
      chunks.push(buf.subarray(start, end));
      offset = end;
    }

    if (chunks.length === 0) return buf;
    return Buffer.concat(chunks);
  }

  /**
   * Stream de logs do container em tempo real
   * Retorna um ReadableStream que pode ser usado para receber logs continuamente
   */
  async streamLogs(
    containerId: string,
    options: { follow?: boolean; tail?: number } = {}
  ): Promise<NodeJS.ReadableStream> {
    const container = this.docker.getContainer(containerId);

    return await new Promise((resolve, reject) => {
      container.logs(
        {
          stdout: true,
          stderr: true,
          follow: true,
          tail: options.tail ?? 0,
          timestamps: true,
        },
        (err: any, stream: any) => {
          if (err) {
            const message = err instanceof Error ? err.message : String(err);
            reject(new DockerError(`Failed to stream logs: ${message}`, 'LOGS_STREAM_FAILED', containerId));
            return;
          }
          if (!stream) {
            reject(new DockerError('No log stream returned', 'LOGS_STREAM_FAILED', containerId));
            return;
          }
          const out = new PassThrough();
          this.docker.modem.demuxStream(stream as any, out, out);
          (stream as any).on('end', () => out.end());
          (stream as any).on('error', (e: any) => out.emit('error', e));
          resolve(out as NodeJS.ReadableStream);
        }
      );
    });
  }

  /**
   * Remove um container
   */
  async removeContainer(containerId: string, force: boolean = false): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force, v: true }); // v=true remove volumes associados
    } catch (error) {
      if (this.isNoSuchContainerError(error)) return;
      const message = error instanceof Error ? error.message : String(error);
      throw new DockerError(`Failed to remove container: ${message}`, 'REMOVE_FAILED', containerId);
    }
  }

  /**
   * Verifica o status de um container
   */
  async getContainerStatus(containerId: string): Promise<'running' | 'stopped' | 'paused' | 'exited' | 'unknown'> {
    try {
      const info = await this.docker.getContainer(containerId).inspect();
      if (info.State.Paused) {
        return 'paused';
      } else if (info.State.Running) {
        return 'running';
      } else {
        return 'exited';
      }
    } catch {
      return 'unknown';
    }
  }

  /**
   * ObtÃ©m informaÃ§Ãµes do container
   */
  async inspectContainer(containerId: string): Promise<Docker.ContainerInspectInfo> {
    try {
      const container = this.docker.getContainer(containerId);
      return await container.inspect();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new DockerError(`Failed to inspect container: ${message}`, 'INSPECT_FAILED', containerId);
    }
  }

  /**
   * Lista todos os containers de workspace
   */
  async listWorkspaceContainers(): Promise<Docker.ContainerInfo[]> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      return containers.filter((c) => c.Names.some((n) => n.startsWith('/workspace-')));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new DockerError(`Failed to list containers: ${message}`, 'LIST_FAILED');
    }
  }
  async createTaskContainer(params: {
    taskId: string;
    image: string;
    repoPath: string;
    networkMode?: string;
    env?: Record<string, string>;
  }): Promise<string> {
    const dockerConfig = {
      image: params.image,
      dockerfilePath: '',
      networkMode: params.networkMode,
      environment: params.env,
      volumeBindings: {
        [params.repoPath]: '/repo',
      },
    };

    // Reuse existing createContainer, but adjust name/working dir by creating a temporary config.
    // We create a minimal WorkspaceConfig-like object.
    const fakeWorkspace = {
      id: `task-${params.taskId}`,
      taskId: params.taskId,
      mountPath: params.repoPath,
      status: 'creating',
      createdAt: new Date(),
      lastActivityAt: new Date(),
      dockerConfig,
    } as any;

    // createContainer names the container as "workspace-<id>", so this becomes workspace-task-<taskId>.
    const id = await this.createContainer(fakeWorkspace, dockerConfig as any);

    // Ensure default working dir for exec is /repo when using TaskManager.
    return id;
  }
}


