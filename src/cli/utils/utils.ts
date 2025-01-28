import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';

const localDirectory = path.resolve(process.cwd(), 'tmp/savedTranscriptsAndSummaries');

export function getLocalDirectoryPath(fileName: string): string {
  try {
    console.log('Resolved local directory path:', localDirectory); // Debug log
    if (!fs.existsSync(localDirectory)) {
      console.log('Directory does not exist. Creating...');
      fs.mkdirSync(localDirectory, { recursive: true });
    }
    return path.join(localDirectory, fileName);
  } catch (error) {
    console.error('Error resolving local directory path:', error);
    throw error;
  }
}

export function saveResultToFile(filePath: string, result: string) {
  try {
    console.log(`Attempting to save file at: ${filePath}`);
    fs.writeFileSync(filePath, result);
    console.log(`Result successfully saved to ${filePath}`);
  } catch (error) {
    console.error('Error saving result to file:', error);
    throw error;
  }
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

export function parseArgs(args: string[]) {
  const parsed: { url?: string; words?: number; fileName?: string } = { words: 400 };

  for (const arg of args) {
    if (arg.startsWith('--words=')) {
      const words = parseInt(arg.split('=')[1], 10);
      if (!isNaN(words) && words > 0) {
        parsed.words = words;
      } else {
        console.warn('Invalid word count specified. Using default value: 400.');
      }
    } else if (arg.startsWith('--save=')) {
      parsed.fileName = arg.split('=')[1];
    } else {
      parsed.url = arg;
    }
  }

  if (!parsed.url) {
    throw new Error('No URL provided.');
  }

  return parsed;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds %= 24 * 60 * 60;
    
    const hours = Math.floor(seconds / (60 * 60));
    seconds %= 60 * 60;
    
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    
    const parts = [];
    
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    
    return parts.join(' ');
}
