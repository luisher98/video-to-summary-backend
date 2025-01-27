export function handleHelpCommand() {
  console.log(`Available commands:
  - summary <url> [--words=<number>] [--prompt=<text>] [--save=<filename>]
    Generate a summary of a YouTube video
    
  - transcript <url> [--save=<filename>]
    Get the transcript of a YouTube video
    
  - monitor
    Start real-time server monitoring (CPU, Memory, Requests)
    
  - status
    Check server status
    
  - stop
    Stop the server
    
  - help
    Display this help message
    
  - quit, q
    Exit the CLI
  `);
}
  