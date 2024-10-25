import readline from 'readline';
import { handleHelpCommand } from './commands/help.ts';
import { handleYouTubeCommand } from './commands/youtube.ts';
// import { handleStatus } from './commands/status.ts';
// import { handleStop } from './commands/stop.ts';

// Command registry
const commands: { [key: string]: Function } = {
  help: handleHelpCommand,
  // status: handleStatus,
  // stop: handleStop,
  youtube: handleYouTubeCommand,
};

// Start the CLI
export function startCLI() {
  console.log(`
    YouTube Summary CLI mode activated.
    Type 'help' to see available commands.
  `);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'YouTubeSummary> ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const [command, ...args] = line.trim().split(' ');

    if (!command) {
      console.log('Please enter a command.');
    } else if (commands[command]) {
      try {
        await commands[command](...args); // Pass command arguments (e.g., YouTube link)
      } catch (error) {
        console.error(`Error executing '${command}':`, error.message);
      }
    } else {
      console.log(`Unknown command: '${command}'`);
    }

    rl.prompt();
  });

  rl.on('close', async () => {
    console.log('Shutting down CLI...');
    // await handleStopCommand(); // not implemented for now
    process.exit(0);
  });
}
