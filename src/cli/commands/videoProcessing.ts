import videoInfo from '../../services/info/videoInfo.js';
import { getCurrentDateTime } from '../../utils/formatters/dateTime.js';
import { YouTubeVideoSummary } from '../../services/summary/providers/youtube/youtubeSummaryService.js';
import { parseArgs, getLocalDirectoryPath, saveResultToFile, promptOutputOption } from '../utils/utils.js';
import { warning } from '../style/colors.js';

/**
 * Command arguments for video processing
 */
interface CommandArgs {
  /** YouTube video URL */
  url?: string;
  /** Number of words for summary */
  words?: number;
  /** Additional instructions for AI */
  additionalPrompt?: string;
  /** Output file name */
  fileName?: string;
}

/**
 * Handles CLI commands for generating video summaries and transcripts.
 * 
 * @param {('summary'|'transcript')} commandType - Type of output to generate
 * @param {string[]} args - Command line arguments
 * @returns {Promise<void>}
 * 
 * @example
 * // Generate summary
 * handleCommand('summary', ['https://youtube.com/watch?v=...', '--words=300']);
 * 
 * // Generate transcript
 * handleCommand('transcript', ['https://youtube.com/watch?v=...']);
 */
export async function handleCommand(commandType: 'summary' | 'transcript', args: string[]) {
  const parsedArgs = parseArgs(args) as CommandArgs;
  
  if (!parsedArgs.url) {
    displayUsage(commandType);
    return;
  }

  try {
    // Get video info
    const info = await videoInfo(parsedArgs.url);
    console.log(`Processing video: ${info.title}`);

    // Create processor instance
    const processor = new YouTubeVideoSummary();

    // Process video
    const result = await processor.process({
      url: parsedArgs.url,
      words: parsedArgs.words,
      additionalPrompt: parsedArgs.additionalPrompt,
      returnTranscriptOnly: commandType === 'transcript',
      updateProgress: (progress) => {
        console.log(`${progress.message} (${Math.round(progress.progress)}%)`);
      }
    });

    // Handle output
    const defaultFileName = `${commandType}_${getCurrentDateTime()}.txt`;
    const outputFileName = parsedArgs.fileName || defaultFileName;
    const outputPath = await getLocalDirectoryPath(outputFileName);

    const shouldSave = await promptOutputOption();
    if (shouldSave) {
      await saveResultToFile(result, outputPath);
      console.log(`\nSaved ${commandType} to: ${outputPath}`);
    } else {
      console.log(`\n${commandType.toUpperCase()}:\n${result}`);
    }

  } catch (error) {
    console.error(warning(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}

/**
 * Displays command usage information.
 * 
 * @param {('summary'|'transcript')} commandType - Type of command
 * @private
 */
function displayUsage(commandType: 'summary' | 'transcript') {
  const baseUsage = `${commandType} <url>`;
  const options = commandType === 'summary' 
    ? '[--words=<number>] [--prompt=<text>] [--save=<filename>]'
    : '[--save=<filename>]';
  
  console.error(warning(`\nUsage: ${baseUsage} ${options}`));
}
