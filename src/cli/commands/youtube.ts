import inquirer from 'inquirer';
import { outputSummary } from '../../services/summary/outputSummary.ts';
import { BadRequestError } from './../../utils/errorHandling.ts';
import { parseArgs } from './utils.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localDirectory = path.resolve(__dirname, '../../tmp/savedTranscriptsAndSummaries');

export async function handleCommand(commandType: 'summary' | 'transcript', args: string[]) {
  const { url, words, additionalPrompt, fileName } = parseArgs(args);

  if (!url) {
    console.error(
      `Usage: ${commandType} <url> ${commandType === 'summary' ? `[--words=<number of words>] [--prompt=<your prompt>]` : ''} [--save=<file name>]`
    );
    return;
  }

  try {
    console.log(`Processing YouTube video ${commandType ? 'transcript' : 'summary'}...`);

    const result = await outputSummary({
      url,
      words,
      returnTranscriptOnly: commandType === 'transcript',
      additionalPrompt,
    });

    // Prompt the user for output options
    const { outputOption } = await inquirer.prompt([
      {
        type: 'list',
        name: 'outputOption',
        message: 'How would you like to output the result?',
        choices: [
          { name: 'Display in terminal', value: 'terminal' },
          { name: 'Save to file', value: 'file' },
        ],
      },
    ]);

    if (outputOption === 'file') {
      // Ensure the local directory exists
      if (!fs.existsSync(localDirectory)) {
        fs.mkdirSync(localDirectory, { recursive: true });
      }
      const filePath = path.join(localDirectory, fileName || `${commandType}_output.txt`);
      fs.writeFileSync(filePath, result);
      console.log(`Result saved to ${filePath}`);
    } else {
      console.log(`Generated ${commandType === 'transcript' ? 'Transcript' : 'Summary'}:`);
      console.log(result);
    }
  } catch (error) {
    console.error('Error during processing:', error.message);
  }
}
