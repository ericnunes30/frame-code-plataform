/**
 * Gerenciador de containers Docker para isolamento de workspaces
 */

import Docker from 'dockerode';
import { promises as fs } from 'fs';
import path from 'path';
import {
  DockerConfig,
  WorkspaceConfig,
  ExecutionResult,
  DockerError,
} from './types';

export class DockerWorkspace {
  private docker: Docker;

  constructor() {
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
    });
  }

  /**
   * Verifica se o Docker está disponível
   */
  async isDockerAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
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
   * Garante que a imagem existe, fazendo pull se necessário
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
      // Verifica se Docker está disponível
      if (!(await this.isDockerAvailable())) {
        throw new DockerError('Docker is not available', 'DOCKER_UNAVAILABLE');
      }

      // Garante que a imagem existe
      await this.ensureImage(dockerConfig.image);

      // Cria diretório de montagem se não existir
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

      // Prepara variáveis de ambiente
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

          stream.on('data', (chunk: Buffer) => {
            const data = chunk.toString();
            stdout += data;
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
   * Obtém logs do container
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
      return logs.toString('utf-8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new DockerError(`Failed to get logs: ${message}`, 'LOGS_FAILED', containerId);
    }
  }

  /**
   * Remove um container
   */
  async removeContainer(containerId: string, force: boolean = false): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force, v: true }); // v=true remove volumes associados
    } catch (error) {
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
      if (info.State.Running) {
        return 'running';
      } else if (info.State.Paused) {
        return 'paused';
      } else {
        return 'exited';
      }
    } catch {
      return 'unknown';
    }
  }

  /**
   * Obtém informações do container
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
}
