import videoInfo from '../../services/info/videoInfo.ts';
import { getCurrentDateTime } from '../../utils/utils.ts';
import { outputSummary } from '../../services/summary/outputSummary.ts';
import { parseArgs, getLocalDirectoryPath, saveResultToFile, promptOutputOption } from '../utils/utils.ts';
import { warning } from '../style/colors.ts';

interface CommandArgs {
  url?: string;
  words?: number;
  additionalPrompt?: string;
  fileName?: string;
}

export async function handleCommand(commandType: 'summary' | 'transcript', args: string[]) {
  try {
    const { url, words, additionalPrompt, fileName } = parseArgs(args) as CommandArgs;

    if (!url) {
      displayUsage(commandType);
      return;
    }

    console.log(`Processing YouTube video for ${commandType}...`);

    const outputOption = await promptOutputOption();
    const info = await videoInfo(url);
    
    if (!info) {
      throw new Error('Failed to fetch video information. Please check the URL and try again.');
    }

    const result = await outputSummary({
      url,
      words,
      returnTranscriptOnly: commandType === 'transcript',
      additionalPrompt,
    });

    if (!result) {
      throw new Error('Failed to generate result. The video might be too long or unavailable.');
    }

    if (outputOption === 'file') {
      const outputFileName = fileName || `${commandType}_${info.title}_${getCurrentDateTime()}.txt`;
      const filePath = getLocalDirectoryPath(outputFileName);
      saveResultToFile(filePath, result);
    } else {
      console.log(`\nGenerated ${commandType === 'transcript' ? 'Transcript' : 'Summary'}:`);
      console.log(result);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(warning(`\nError: ${errorMessage}`));
    if (error instanceof Error && error.stack) {
      console.error(warning(`Stack trace: ${error.stack}`));
    }
  }
}

function displayUsage(commandType: 'summary' | 'transcript') {
  const baseUsage = `${commandType} <url>`;
  const options = commandType === 'summary' 
    ? '[--words=<number>] [--prompt=<text>] [--save=<filename>]'
    : '[--save=<filename>]';
  
  console.error(warning(`\nUsage: ${baseUsage} ${options}`));
}
