interface CommandResult {
    command: string;
    url: string;
}

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