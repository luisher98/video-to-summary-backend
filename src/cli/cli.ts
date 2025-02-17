import readline from 'readline';
import { blue, orange, warning } from './style/colors.js';
import { handleHelpCommand } from './commands/help.js';
import { videoProcessing } from './commands/videoProcessing.js';
import { status } from './commands/status.js';
import { handleStopCommand } from './commands/stop.js';
import { handleMonitorCommand } from './commands/monitor.js';

/**
 * Registry of available CLI commands and their handlers
 * @type {Object.<string, CommandFunction>}
 */
type CommandFunction = (args: string[]) => void | Promise<void>;

/**
 * Command registry mapping command names to their handler functions
 */
const commands: { [key: string]: CommandFunction } = {
  help: handleHelpCommand,
  status: async () => { await status.parseAsync(['node', 'script.js']); },
  stop: handleStopCommand,
  monitor: handleMonitorCommand,
  video: async (args: string[]) => {
    await videoProcessing.parseAsync(['node', 'script.js', ...args]);
  },
  q: () => process.exit(0),
  quit: () => process.exit(0),
};

/**
 * Starts the CLI interface for the YouTube Summary application.
 * Handles user input and routes commands to appropriate handlers.
 * 
 * @returns {void}
 */
export function startCLI() {
  console.clear();
  console.log(orange('Welcome to the YouTubeSummary CLI!'));
  console.log(blue('\nType \'help\' to see available commands.'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\nYouTubeSummary > ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const [command, ...args] = line.trim().split(' ');
  
    if (!command) {
      console.log(warning('\nPlease enter a valid command.'));
    } else if (commands[command]) {
      try {
        const commandsWithoutArgs = ['help', 'q', 'quit', 'status', 'stop', 'monitor'];
        if (!commandsWithoutArgs.includes(command) && args.length === 0) {
          console.log(warning(`\nCommand '${command}' requires arguments. Type 'help' for usage.`));
        } else {
          await commands[command](args);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error(warning(`Error executing '${command}': ${errorMessage}`));
      }
    } else {
      console.log(warning(`Unknown command: '${command}'. Type 'help' to see available commands.`));
    }
  
    rl.prompt();
  });

  rl.on('close', async () => {
    console.log('Shutting down CLI...');
    process.exit(0);
  });
}
