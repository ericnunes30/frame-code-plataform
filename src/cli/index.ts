#!/usr/bin/env node

/**
 * Frame-Code CLI
 * Command-line interface for workspace management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { registerWorkspaceCommands } from './commands/workspace';
import { WorkspaceManager } from '../platform/WorkspaceManager';
import { v4 as uuidv4 } from 'uuid';

const program = new Command();

// Configuração do programa
program
  .name('frame-code')
  .description('Frame-Code Platform - Isolated workspace system for tasks')
  .version('1.0.0');

/**
 * Comando: task (cria e executa uma task com workspace isolado)
 */
program
  .argument('<description>', 'Task description')
  .option('-w, --workspace', 'Create isolated workspace with Docker', false)
  .option('-i, --image <image>', 'Docker image to use', 'node:20-alpine')
  .option('-m, --mount <path>', 'Mount path for workspace')
  .option('-r, --resume <workspaceId>', 'Resume existing workspace')
  .action(async (description: string, options) => {
    console.log('');
    console.log(chalk.cyan('╔══════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.bold('  Frame-Code Platform - Task Execution') + chalk.cyan('             ║'));
    console.log(chalk.cyan('╚══════════════════════════════════════════════════════════╝'));
    console.log('');
    console.log(chalk.gray('Task: ') + description);
    console.log('');

    if (options.workspace) {
      console.log(chalk.yellow('Isolated workspace mode enabled.'));
      console.log('');

      // Cria workspace isolado
      const { promises: fs } = await import('fs');
      const path = await import('path');

      const configPath = path.join(process.cwd(), '.code', 'workspace.config.json');
      let config;

      try {
        const data = await fs.readFile(configPath, 'utf-8');
        config = JSON.parse(data);
      } catch {
        config = {
          defaultImage: options.image,
          workspaceBaseDir: path.join(process.cwd(), '.workspaces'),
          autoCleanup: true,
          sessionTimeout: 86400000,
          maxConcurrentWorkspaces: 5,
          docker: {
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

      const workspaceManager = new WorkspaceManager(config);
      await workspaceManager.initialize();

      if (options.resume) {
        // Resume workspace existente
        console.log(chalk.cyan(`Resuming workspace: ${options.resume}`));
        await workspaceManager.resumeWorkspace(options.resume);

        const workspace = workspaceManager.getWorkspaceStatus(options.resume);
        if (workspace) {
          console.log(chalk.green('✓ Workspace resumed successfully'));
          console.log(chalk.gray(`ID: ${workspace.id}`));
        }
      } else {
        // Cria novo workspace
        const taskId = uuidv4();

        console.log(chalk.cyan('Creating isolated workspace...'));

        const workspace = await workspaceManager.createWorkspace({
          taskId,
          mountPath: options.mount,
          dockerConfig: {
            image: options.image,
            dockerfilePath: '',
          },
        });

        console.log(chalk.green(`✓ Workspace created: ${workspace.id}`));
        console.log('');

        // Inicia o workspace
        console.log(chalk.cyan('Starting Docker container...'));
        await workspaceManager.startWorkspace(workspace.id);
        console.log(chalk.green('✓ Container started'));

        console.log('');
        console.log(chalk.bold('Workspace Info:'));
        console.log(`  ID:       ${chalk.cyan(workspace.id)}`);
        console.log(`  Task ID:  ${chalk.cyan(workspace.taskId)}`);
        console.log(`  Mount:    ${chalk.cyan(workspace.mountPath)}`);
        console.log('');
        console.log(chalk.gray('To manage this workspace, use:'));
        console.log(`  frame-code workspace list`);
        console.log(`  frame-code workspace exec ${workspace.id} "<command>"`);
        console.log(`  frame-code workspace destroy ${workspace.id}`);
      }
    } else {
      console.log(chalk.yellow('Standard mode (no workspace isolation)'));
      console.log(chalk.gray('Use --workspace flag to enable Docker isolation'));
    }
  });

/**
 * Comando: init (inicializa configuração)
 */
program
  .command('init')
  .description('Initialize Frame-Code configuration')
  .action(async () => {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    const configDir = path.join(process.cwd(), '.code');
    const configFile = path.join(configDir, 'workspace.config.json');

    try {
      await fs.mkdir(configDir, { recursive: true });

      const defaultConfig = {
        defaultImage: 'node:20-alpine',
        workspaceBaseDir: '.workspaces',
        autoCleanup: true,
        sessionTimeout: 86400000,
        maxConcurrentWorkspaces: 5,
        docker: {
          networkMode: 'bridge',
          portBindings: {},
          volumeBindings: {
            '.': '/workspace',
          },
          environment: {
            NODE_ENV: 'development',
          },
        },
        persist: {
          enabled: true,
          path: '.workspaces',
          compression: true,
        },
      };

      await fs.writeFile(configFile, JSON.stringify(defaultConfig, null, 2));
      console.log(chalk.green('✓ Configuration created at .code/workspace.config.json'));
    } catch (error) {
      console.error(chalk.red('Failed to create configuration'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      process.exit(1);
    }
  });

/**
 * Comando: status (mostra status do sistema)
 */
program
  .command('status')
  .description('Show system status')
  .action(async () => {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    console.log('');
    console.log(chalk.cyan('Frame-Code Platform Status'));
    console.log('');

    // Verifica Docker
    try {
      const { DockerWorkspace } = await import('../platform/DockerWorkspace');
      const docker = new DockerWorkspace();
      const isAvailable = await docker.isDockerAvailable();

      console.log(`${chalk.gray('Docker:')} ${isAvailable ? chalk.green('Available') : chalk.red('Not Available')}`);

      if (isAvailable) {
        const containers = await docker.listWorkspaceContainers();
        console.log(`${chalk.gray('Workspace Containers:')} ${containers.length}`);
      }
    } catch {
      console.log(`${chalk.gray('Docker:')} ${chalk.red('Error checking')}`);
    }

    // Verifica configuração
    const configPath = path.join(process.cwd(), '.code', 'workspace.config.json');
    try {
      await fs.access(configPath);
      console.log(`${chalk.gray('Configuration:')} ${chalk.green('Found')}`);
    } catch {
      console.log(`${chalk.gray('Configuration:')} ${chalk.yellow('Not found (run "frame-code init")')}`);
    }

    // Lista workspaces
    try {
      const { loadConfig } = await import('./commands/workspace');
      const config = await loadConfig();
      const workspaceManager = new WorkspaceManager(config);
      await workspaceManager.initialize();

      const stats = workspaceManager.getStats();
      console.log(`${chalk.gray('Total Workspaces:')} ${stats.total}`);
      console.log(`  ${chalk.green('Running:')} ${stats.running}`);
      console.log(`  ${chalk.yellow('Paused:')} ${stats.paused}`);
      console.log(`  ${chalk.gray('Stopped:')} ${stats.stopped}`);
      console.log(`  ${chalk.red('Error:')} ${stats.error}`);
    } catch {
      console.log(`${chalk.gray('Workspaces:')} ${chalk.yellow('Error loading')}`);
    }

    console.log('');
  });

// Registra comandos de workspace
registerWorkspaceCommands(program);

// Parse argumentos
program.parse();

// Mostra help se nenhum comando fornecido
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
