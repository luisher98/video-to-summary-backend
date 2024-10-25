import { outputSummary } from '../../services/summary/outputSummary.ts';
import { BadRequestError } from './../../utils/errorHandling.ts';
import { parseArgs } from './utils.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory in ESM context (like __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set the local directory where files will be saved
const localDirectory = path.resolve(__dirname, '../../tmp/savedTranscriptsAndSummaries');

// Unified handler for both summary and transcript
export async function handleCommand(commandType: 'summary' | 'transcript', args: string[]) {
  const { url, words, additionalPrompt, returnTranscriptOnly, fileName } = parseArgs(args);

  if (!url) {
    console.error(
      `Usage: ${commandType} <url> ${commandType === 'summary' ? `[--words=<number of words>] [--prompt=<your prompt>]`: ''} [--save=<file name>]`
    );
    return;
  }

  try {
    console.log(`Processing YouTube video ${returnTranscriptOnly ? 'transcript' : 'summary'}...`);

    // Call the outputSummary function
    const result = await outputSummary({
      url,
      words,
      returnTranscriptOnly,
      additionalPrompt,
    });

    const outputType = returnTranscriptOnly ? 'Transcript' : 'Summary';

    // Check if the local directory exists, create it if not
    if (!fs.existsSync(localDirectory)) {
      fs.mkdirSync(localDirectory, { recursive: true });
    }

    // If the --save flag is provided, save the result to the file
    if (fileName) {
      const filePath = path.join(localDirectory, fileName);
      fs.writeFile(filePath, result, (err) => {
        if (err) {
          console.error(`Error writing to file: ${err.message}`);
        } else {
          console.log(`${outputType} saved to ${filePath}`);
        }
      });
    } else {
      // If no --save flag, output result to the console
      console.log(`${outputType} generated:`);
      console.log(result);
    }
  } catch (error) {
    console.error('Error during processing:', error.message);
  }
}
