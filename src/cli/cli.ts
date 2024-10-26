import readline from 'readline';
import { blue, orange, warning } from './style/colors.ts';
import { handleHelpCommand } from './commands/help.ts';
import { handleCommand } from './commands/videoProcessing.ts';

// Command registry
const commands: { [key: string]: Function } = {
  help: handleHelpCommand,
  summary: (args: string[]) => handleCommand('summary', args),
  transcript: (args: string[]) => handleCommand('transcript', args),
};

// Start the CLI
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
      console.log(warning('\nPlease enter a command.'));
    } else if (commands[command]) {
      try {
        await commands[command](args); // Pass command arguments (as an array) to the command
      } catch (error) {
        console.error(`Error executing '${command}':`, error.message);
      }
    } else {
      console.log(`Unknown command: '${command}'. Type 'help' to see available commands.`);
    }

    rl.prompt();
  });

  rl.on('close', async () => {
    console.log('Shutting down CLI...');
    process.exit(0);
  });
}
