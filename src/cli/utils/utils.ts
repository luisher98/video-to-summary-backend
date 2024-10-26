import fs from 'fs';
import path from 'path';
import readline from 'readline';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localDirectory = path.resolve(__dirname, '../../../tmp/savedTranscriptsAndSummaries');

export function getLocalDirectoryPath(fileName: string): string {
  if (!fs.existsSync(localDirectory)) {
    fs.mkdirSync(localDirectory, { recursive: true });
  }
  return path.join(localDirectory, fileName);
}

export function saveResultToFile(filePath: string, result: string) {
  fs.writeFileSync(filePath, result);
  console.log(`Result saved to ${filePath}`);
}

export async function promptOutputOption(): Promise<'terminal' | 'file'> {
  const { outputOption } = await inquirer.prompt([
    {
      type: 'list',
      name: 'outputOption',
      message: 'How would you like to output the result?',
      choices: [
        { name: 'Display in terminal', value: 'terminal' },
        { name: 'Save to file', value: 'file' },
      ],
      default: 'terminal',
    },
  ]);
  return outputOption;
}

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

