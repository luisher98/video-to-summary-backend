export function handleHelpCommand() {
    console.log(`Available commands:
      - status: Check server status
      - stop: Stop the server
      - youtube <url> [--words=<number of words>] [--prompt=<your prompt>] [--transcriptOnly]
      - help: Display this help
      - quit or q: Exit the CLI
    `);
  }
  