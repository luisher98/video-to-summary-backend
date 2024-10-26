import readline from 'readline';

export function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, (answer: string) => {
    rl.close();
    resolve(answer);
  }));
}

export function parseArgs(args: string[]) {
  const parsed: {
    url?: string;
    additionalPrompt?: string;
    words?: number;
    fileName?: string;
    returnTranscriptOnly?: boolean;
  } = { returnTranscriptOnly: false, words: 400 }; // Default values

  for (let i = 0; i < args.length; i++) {
    if (i === 0) {
      parsed.url = args[i]; // First argument is always the URL
    } else if (args[i].startsWith('--prompt=')) {
      parsed.additionalPrompt = args[i].split('=')[1];
    } else if (args[i].startsWith('--words=')) {
      const wordCount = parseInt(args[i].split('=')[1], 10);
      if (!isNaN(wordCount) && wordCount > 0) {
        parsed.words = wordCount;
      }
    } else if (args[i].startsWith('--save=')) {
      let fileName = args[i].split('=')[1];
      if (!fileName.endsWith('.txt')) {
        fileName += '.txt'; // Ensure the file has a .txt extension
      }
      parsed.fileName = fileName;
    } 
  }

  return parsed;
}

