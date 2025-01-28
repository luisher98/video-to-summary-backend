/**
 * Result of parsing a CLI command
 */
interface CommandResult {
    /** The command to execute */
    command: string;
    /** YouTube video URL */
    url: string;
}

/**
 * Parses and validates CLI command arguments.
 * 
 * @param {string[]} args - Command line arguments
 * @returns {CommandResult} Parsed command and URL
 * @throws {Error} If URL is missing or invalid, or if command is invalid
 * 
 * @example
 * parseCommand(['summary', 'https://youtube.com/watch?v=...']);
 * // Returns: { command: 'summary', url: 'https://youtube.com/watch?v=...' }
 */
export function parseCommand(args: string[]): CommandResult {
    if (args.length < 2) {
        throw new Error('URL is required');
    }

    const [command, url] = args;

    if (!['summary', 'transcript'].includes(command)) {
        throw new Error('Invalid command');
    }

    if (!url.includes('youtube.com/watch?v=')) {
        throw new Error('Invalid YouTube URL');
    }

    return {
        command,
        url
    };
} 