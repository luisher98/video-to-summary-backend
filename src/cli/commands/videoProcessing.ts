import videoInfo from '../../services/info/videoInfo.ts';
import { getCurrentDateTime } from '../../utils/utils.ts';
import { outputSummary } from '../../services/summary/outputSummary.ts';
import { parseArgs, getLocalDirectoryPath, saveResultToFile, promptOutputOption } from '../utils/utils.ts';


export async function handleCommand(commandType: 'summary' | 'transcript', args: string[]) {
  try {
    const { url, words, additionalPrompt, fileName } = parseArgs(args);

    if (!url) {
      displayUsage(commandType);
      return;
    }

    console.log(`Processing YouTube video for ${commandType}...`);

    const outputOption = await promptOutputOption();

    const [info, result] = await Promise.all([videoInfo(url), outputSummary({
      url,
      words,
      returnTranscriptOnly: commandType === 'transcript',
      additionalPrompt,
    })]);

    if (!result) {
      console.error('Failed to generate result.');
      return;
    }

    if (outputOption === 'file') {
      const filePath = getLocalDirectoryPath(fileName || `${commandType}_${info.title}_${getCurrentDateTime()}.txt`);
      saveResultToFile(filePath, result);
    } else {
      console.log(`Generated ${commandType === 'transcript' ? 'Transcript' : 'Summary'}:`);
      console.log(result);
    }
    
  } catch (error) {
    console.error('Error during processing:', error instanceof Error ? error.message : error);
  }
}

function displayUsage(commandType: 'summary' | 'transcript') {
  console.error(
    `Usage: ${commandType} <url> ${
      commandType === 'summary' ? `[--words=<number of words>] [--prompt=<your prompt>]` : ''
    } [--save=<file name>]`
  );
}
