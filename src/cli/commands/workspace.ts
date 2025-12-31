/**
 * Comandos CLI para gerenciar workspaces
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora, { Ora } from 'ora';
import { promises as fs } from 'fs';
import path from 'path';
import { WorkspaceManager } from '../../platform/WorkspaceManager';
import { PlatformConfig } from '../../platform/types';

/**
 * Carrega a configuração da plataforma
 */
async function loadConfig(): Promise<PlatformConfig> {
  const configPath = path.join(process.cwd(), '.code', 'workspace.config.json');

  try {
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Retorna configuração padrão
    return {
      defaultImage: 'node:20-alpine',
      workspaceBaseDir: path.join(process.cwd(), '.workspaces'),
      autoCleanup: true,
      sessionTimeout: 86400000, // 24 horas
      maxConcurrentWorkspaces: 5,
      docker: {
        image: 'node:20-alpine',
        dockerfilePath: '',
        networkMode: 'bridge',
        portBindings: {},
        volumeBindings: {},
        environment: {},
      },
      persist: {
        enabled: true,
        path: '.workspaces',
        compression: true,
      },
    };
  }
}

/**
 * Formata timestamp para exibição
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Formata status com cores
 */
function formatStatus(status: string): string {
  switch (status) {
    case 'running':
      return chalk.green('● ') + status;
    case 'paused':
      return chalk.yellow('● ') + status;
    case 'stopped':
      return chalk.gray('○ ') + status;
    case 'error':
      return chalk.red('● ') + status;
    case 'creating':
      return chalk.blue('○ ') + status;
    default:
      return status;
  }
}

/**
 * Lista todos os workspaces
 */
export async function listWorkspacesCommand(options: { all?: boolean }): Promise<void> {
  const config = await loadConfig();
  const workspaceManager = new WorkspaceManager(config);
  await workspaceManager.initialize();

  const workspaces = workspaceManager.listWorkspaces();

  if (workspaces.length === 0) {
    console.log(chalk.gray('No workspaces found.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Task ID'),
      chalk.cyan('Status'),
      chalk.cyan('Created'),
      chalk.cyan('Last Activity'),
    ],
    colWidths: [38, 30, 15, 20, 20],
    wordWrap: true,
  });

  for (const ws of workspaces) {
    const id = ws.id.substring(0, 36);
    table.push([
      id,
      ws.taskId.substring(0, 28),
      formatStatus(ws.status),
      formatTimestamp(ws.createdAt),
      formatTimestamp(ws.lastActivityAt),
    ]);
  }

  console.log('');
  console.log(table.toString());

  // Mostra estatísticas
  const stats = workspaceManager.getStats();
  console.log('');
  console.log(chalk.gray('Statistics:'));
  console.log(`  Total: ${stats.total}`);
  console.log(`  ${chalk.green('Running:')} ${stats.running}`);
  console.log(`  ${chalk.yellow('Paused:')} ${stats.paused}`);
  console.log(`  ${chalk.gray('Stopped:')} ${stats.stopped}`);
  console.log(`  ${chalk.red('Error:')} ${stats.error}`);
}

/**
 * Mostra detalhes de um workspace
 */
export async function showWorkspaceCommand(workspaceId: string): Promise<void> {
  const config = await loadConfig();
  const workspaceManager = new WorkspaceManager(config);
  await workspaceManager.initialize();

  const workspace = workspaceManager.getWorkspaceStatus(workspaceId);

  if (!workspace) {
    console.error(chalk.red(`Workspace ${workspaceId} not found.`));
    process.exit(1);
  }

  console.log('');
  console.log(chalk.cyan('Workspace Details:'));
  console.log('');
  console.log(`${chalk.gray('ID:')}           ${workspace.id}`);
  console.log(`${chalk.gray('Task ID:')}      ${workspace.taskId}`);
  console.log(`${chalk.gray('Status:')}       ${formatStatus(workspace.status)}`);
  console.log(`${chalk.gray('Container ID:')} ${workspace.containerId || 'N/A'}`);
  console.log(`${chalk.gray('Mount Path:')}   ${workspace.mountPath}`);
  console.log(`${chalk.gray('Created:')}      ${workspace.createdAt.toISOString()}`);
  console.log(`${chalk.gray('Last Activity:')} ${workspace.lastActivityAt.toISOString()}`);
  console.log('');

  // Mostra histórico de sessão
  const sessionManager = workspaceManager.getSessionManager();
  const messages = await sessionManager.getMessages(workspaceId);

  if (messages.length > 0) {
    console.log(chalk.cyan('Chat History:'));
    console.log('');
    for (const msg of messages.slice(-10)) {
      const role = msg.role === 'user' ? chalk.green('User:') : chalk.blue('Agent:');
      console.log(`${role} ${msg.content}`);
    }
  }
}

/**
 * Destroi um workspace
 */
export async function destroyWorkspaceCommand(workspaceId: string, options: { force?: boolean }): Promise<void> {
  const config = await loadConfig();
  const workspaceManager = new WorkspaceManager(config);
  await workspaceManager.initialize();

  const workspace = workspaceManager.getWorkspaceStatus(workspaceId);

  if (!workspace) {
    console.error(chalk.red(`Workspace ${workspaceId} not found.`));
    process.exit(1);
  }

  if (!options.force) {
    const inquirer = await import('inquirer');
    const { confirm } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to destroy workspace ${workspaceId.substring(0, 8)}?`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Cancelled.'));
      return;
    }
  }

  const spinner = ora('Destroying workspace...').start();

  try {
    await workspaceManager.destroyWorkspace(workspaceId);
    spinner.succeed(chalk.green(`Workspace ${workspaceId.substring(0, 8)} destroyed.`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to destroy workspace.'));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    process.exit(1);
  }
}

/**
 * Limpa todos os workspaces
 */
export async function purgeWorkspacesCommand(options: { force?: boolean }): Promise<void> {
  const config = await loadConfig();
  const workspaceManager = new WorkspaceManager(config);
  await workspaceManager.initialize();

  const workspaces = workspaceManager.listWorkspaces();

  if (workspaces.length === 0) {
    console.log(chalk.gray('No workspaces to purge.'));
    return;
  }

  if (!options.force) {
    const inquirer = await import('inquirer');
    const { confirm } = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to destroy ALL ${workspaces.length} workspaces?`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Cancelled.'));
      return;
    }
  }

  const spinner = ora(`Purging ${workspaces.length} workspaces...`).start();

  try {
    const count = await workspaceManager.purgeAllWorkspaces();
    spinner.succeed(chalk.green(`Purged ${count} workspaces.`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to purge workspaces.'));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    process.exit(1);
  }
}

/**
 * Para um workspace
 */
export async function stopWorkspaceCommand(workspaceId: string): Promise<void> {
  const config = await loadConfig();
  const workspaceManager = new WorkspaceManager(config);
  await workspaceManager.initialize();

  const spinner = ora('Stopping workspace...').start();

  try {
    await workspaceManager.stopWorkspace(workspaceId);
    spinner.succeed(chalk.green(`Workspace ${workspaceId.substring(0, 8)} stopped.`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to stop workspace.'));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    process.exit(1);
  }
}

/**
 * Retoma um workspace
 */
export async function resumeWorkspaceCommand(workspaceId: string): Promise<void> {
  const config = await loadConfig();
  const workspaceManager = new WorkspaceManager(config);
  await workspaceManager.initialize();

  const spinner = ora('Resuming workspace...').start();

  try {
    await workspaceManager.resumeWorkspace(workspaceId);
    spinner.succeed(chalk.green(`Workspace ${workspaceId.substring(0, 8)} resumed.`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to resume workspace.'));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    process.exit(1);
  }
}

/**
 * Mostra logs de um workspace
 */
export async function logsWorkspaceCommand(workspaceId: string, options: { tail?: number; follow?: boolean }): Promise<void> {
  const config = await loadConfig();
  const workspaceManager = new WorkspaceManager(config);
  await workspaceManager.initialize();

  try {
    const logs = await workspaceManager.getWorkspaceLogs(workspaceId, options.tail || 100);

    // Formata logs (remove cabeçalhos do Docker)
    const lines = logs.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      // Remove timestamp do Docker se presente
      const cleanLine = line.replace(/^\S+\s+\S+\s+/, '');
      console.log(cleanLine);
    }

    if (options.follow) {
      console.log(chalk.gray('\n[Following logs - Ctrl+C to exit]'));
      // TODO: Implementar follow mode com streaming
    }
  } catch (error) {
    console.error(chalk.red('Failed to get logs.'));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    process.exit(1);
  }
}

/**
 * Executa um comando em um workspace
 */
export async function execWorkspaceCommand(workspaceId: string, command: string): Promise<void> {
  const config = await loadConfig();
  const workspaceManager = new WorkspaceManager(config);
  await workspaceManager.initialize();

  const spinner = ora(`Executing: ${command}`).start();

  try {
    const result = await workspaceManager.executeInWorkspace({
      workspaceId,
      command,
    });

    spinner.stop();

    if (result.stdout) {
      console.log(result.stdout);
    }

    if (result.stderr) {
      console.error(chalk.yellow(result.stderr));
    }

    if (result.exitCode !== 0) {
      console.log(chalk.red(`Exit code: ${result.exitCode}`));
      process.exit(result.exitCode);
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to execute command.'));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    process.exit(1);
  }
}

/**
 * Exporta loadConfig para uso em outros módulos
 */
export { loadConfig };

/**
 * Registra os comandos de workspace no CLI
 */
export function registerWorkspaceCommands(program: Command): void {
  const workspaceCmd = program.command('workspace').description('Workspace management commands');

  // List workspaces
  workspaceCmd
    .command('list')
    .description('List all workspaces')
    .option('-a, --all', 'Show all workspaces including stopped ones')
    .action(listWorkspacesCommand);

  // Show workspace details
  workspaceCmd.command('show <workspaceId>').description('Show workspace details').action(showWorkspaceCommand);

  // Stop workspace
  workspaceCmd.command('stop <workspaceId>').description('Stop a workspace').action(stopWorkspaceCommand);

  // Resume workspace
  workspaceCmd.command('resume <workspaceId>').description('Resume a paused/stopped workspace').action(resumeWorkspaceCommand);

  // Destroy workspace
  workspaceCmd
    .command('destroy <workspaceId>')
    .description('Destroy a workspace')
    .option('-f, --force', 'Skip confirmation')
    .action(destroyWorkspaceCommand);

  // Purge all workspaces
  workspaceCmd
    .command('purge')
    .description('Destroy all workspaces')
    .option('-f, --force', 'Skip confirmation')
    .action(purgeWorkspacesCommand);

  // Show logs
  workspaceCmd
    .command('logs <workspaceId>')
    .description('Show workspace logs')
    .option('-n, --tail <number>', 'Number of lines to show', '100')
    .option('-f, --follow', 'Follow log output')
    .action(logsWorkspaceCommand);

  // Execute command
  workspaceCmd
    .command('exec <workspaceId> <command>')
    .description('Execute a command in the workspace')
    .action(execWorkspaceCommand);
}
