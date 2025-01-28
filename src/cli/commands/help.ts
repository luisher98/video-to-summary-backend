/**
 * Help command module that displays available CLI commands and their usage.
 * @module commands/help
 */

/**
 * Displays a formatted list of all available commands and their descriptions.
 * Includes usage examples and parameter descriptions.
 * 
 * @returns {void}
 * 
 * @example
 * handleHelpCommand();
 * // Displays:
 * //   - summary <url> [--words=<number>] [--prompt=<text>] [--save=<filename>]
 * //     Generate a summary of a YouTube video
 * //   ...
 */
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
  