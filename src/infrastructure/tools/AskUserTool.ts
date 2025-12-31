/**
 * Tool para que o agente faça perguntas ao usuário durante execução
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import { AskUserParams, AskUserResult, SessionMessage } from '../../platform/types';

export class AskUserTool {
  name = 'ask_user';
  description = 'Ask the user a question during task execution';

  /**
   * Callback para registrar mensagens no chat history
   */
  private onMessage?: (message: SessionMessage) => void;

  constructor(onMessage?: (message: SessionMessage) => void) {
    this.onMessage = onMessage;
  }

  /**
   * Executa a tool
   */
  async execute(params: AskUserParams): Promise<AskUserResult> {
    // Registra a pergunta no chat history
    this._registerMessage({
      id: uuidv4(),
      role: 'agent',
      content: params.question,
      timestamp: new Date(),
      metadata: {
        tool: this.name,
        options: params.options,
        default: params.default,
      },
    });

    console.log('');
    console.log(chalk.cyan('┌─────────────────────────────────────────────────────────┐'));
    console.log(chalk.cyan('│') + chalk.bold.yellow('  Agent Question') + chalk.cyan('                                            │'));
    console.log(chalk.cyan('├─────────────────────────────────────────────────────────┤'));
    console.log(chalk.cyan('│') + ' ' + params.question);
    console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘'));
    console.log('');

    let answer: string;

    if (params.options && params.options.length > 0) {
      // Usa inquirer para seleção de opções
      const result = await inquirer.prompt([
        {
          type: 'list',
          name: 'answer',
          message: 'Select an option:',
          choices: params.default
            ? [
                { name: params.default + ' (default)', value: params.default },
                new inquirer.Separator(),
                ...params.options.filter((o) => o !== params.default),
              ]
            : params.options,
          default: params.default || params.options[0],
        },
      ]);
      answer = result.answer;
    } else {
      // Input livre
      const result = await inquirer.prompt([
        {
          type: 'input',
          name: 'answer',
          message: 'Your answer:',
          default: params.default,
        },
      ]);
      answer = result.answer;
    }

    const result: AskUserResult = {
      answer,
      timestamp: new Date(),
    };

    // Registra a resposta no chat history
    this._registerMessage({
      id: uuidv4(),
      role: 'user',
      content: answer,
      timestamp: new Date(),
      metadata: {
        tool: this.name,
        inResponseTo: params.question,
      },
    });

    console.log('');
    console.log(chalk.green('✓ Answer received'));

    return result;
  }

  /**
   * Registra uma mensagem no chat history
   */
  private _registerMessage(message: SessionMessage): void {
    if (this.onMessage) {
      this.onMessage(message);
    }
  }

  /**
   * Define o callback para registrar mensagens
   */
  onMessageCallback(callback: (message: SessionMessage) => void): void {
    this.onMessage = callback;
  }

  /**
   * Schema da tool para uso com LLMs
   */
  getSchema(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      input_schema: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'The question to ask the user',
          },
          options: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Optional: list of options for the user to choose from',
          },
          default: {
            type: 'string',
            description: 'Optional: default value if user just presses enter',
          },
        },
        required: ['question'],
      },
    };
  }
}

/**
 * Factory para criar instâncias da tool
 */
export function createAskUserTool(onMessage?: (message: SessionMessage) => void): AskUserTool {
  return new AskUserTool(onMessage);
}
