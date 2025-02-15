import { promises as fs } from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { TEMP_DIRS } from '../../utils/constants/paths.js';

/**
 * Gets the absolute path for saving files in the local directory.
 * Creates the directory if it doesn't exist.
 * 
 * @param {string} fileName - Name of the file to save
 * @returns {string} Absolute path to the file
 * @throws {Error} If directory creation fails
 */
export async function getLocalDirectoryPath(fileName: string): Promise<string> {
    try {
        console.log('Using transcripts directory:', TEMP_DIRS.transcripts);
        await fs.mkdir(TEMP_DIRS.transcripts, { recursive: true });
        return path.join(TEMP_DIRS.transcripts, fileName);
    } catch (error) {
        console.error('Error resolving local directory path:', error);
        throw error;
    }
}

/**
 * Parses command line arguments into structured format.
 * 
 * @param {string[]} args - Raw command line arguments
 * @returns {Object} Parsed arguments object
 * @throws {Error} If required URL is missing
 * 
 * @example
 * parseArgs(['https://youtube.com/...', '--words=300']);
 * // Returns: { url: 'https://youtube.com/...', words: 300 }
 */
export function parseArgs(args: string[]): { url?: string; words?: number; fileName?: string } {
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
 * Saves content to a file in the local directory.
 * 
 * @param {string} filePath - Path where the file should be saved
 * @param {string} result - Content to write to the file
 * @throws {Error} If file write operation fails
 */
export async function saveResultToFile(filePath: string, result: string): Promise<void> {
        await fs.writeFile(filePath, result);
}

/**
 * Prompts user to choose output method (terminal or file).
 * 
 * @returns {Promise<'terminal' | 'file'>} Selected output option
 */
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