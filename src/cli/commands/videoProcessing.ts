import { Command } from 'commander';
import { SummaryServiceFactory, MediaSource } from '@/services/summary/SummaryService.js';
import { getCurrentDateTime } from '../../utils/formatters/dateTime.js';
import { getLocalDirectoryPath, saveResultToFile, promptOutputOption } from '../utils/utils.js';
import { warning } from '../style/colors.js';

interface CommandOptions {
  url: string;
  words?: string;
  prompt?: string;
  output?: string;
}

export const videoProcessing = new Command('video')
  .description('Video processing commands');

videoProcessing
  .command('summarize')
  .description('Generate a summary from a YouTube video')
  .requiredOption('-u, --url <url>', 'YouTube video URL')
  .option('-w, --words <number>', 'Maximum words in summary', '400')
  .option('-p, --prompt <string>', 'Additional instructions for the AI')
  .option('-o, --output <filename>', 'Output file name')
  .action(async (options: CommandOptions) => {
    try {
      const summaryService = SummaryServiceFactory.createYouTubeService();
      
      // Set up progress tracking
      summaryService.onProgress((progress) => {
        console.log(`${progress.message} (${progress.progress}%)`);
      });

      // Process video
      const source: MediaSource = {
        type: 'youtube',
        data: { url: options.url }
      };

      const summary = await summaryService.process(source, {
        maxWords: Number(options.words),
        additionalPrompt: options.prompt
      });

      // Handle output
      if (options.output) {
        const outputPath = await getLocalDirectoryPath(options.output);
        await saveResultToFile(summary.content, outputPath);
        console.log(`\nSaved summary to: ${outputPath}`);
      } else {
        const shouldSave = await promptOutputOption();
        if (shouldSave) {
          const defaultFileName = `summary_${getCurrentDateTime()}.txt`;
          const outputPath = await getLocalDirectoryPath(defaultFileName);
          await saveResultToFile(summary.content, outputPath);
          console.log(`\nSaved summary to: ${outputPath}`);
        } else {
          console.log('\nSummary:');
          console.log(summary.content);
        }
      }
    } catch (error) {
      console.error(warning(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

videoProcessing
  .command('transcript')
  .description('Generate a transcript from a YouTube video')
  .requiredOption('-u, --url <url>', 'YouTube video URL')
  .option('-o, --output <filename>', 'Output file name')
  .action(async (options: CommandOptions) => {
    try {
      const summaryService = SummaryServiceFactory.createYouTubeService();
      
      // Set up progress tracking
      summaryService.onProgress((progress) => {
        console.log(`${progress.message} (${progress.progress}%)`);
      });

      // Process video
      const source: MediaSource = {
        type: 'youtube',
        data: { url: options.url }
      };

      const result = await summaryService.process(source, {
        returnTranscriptOnly: true
      });

      // Handle output
      if (options.output) {
        const outputPath = await getLocalDirectoryPath(options.output);
        await saveResultToFile(result.content, outputPath);
        console.log(`\nSaved transcript to: ${outputPath}`);
      } else {
        const shouldSave = await promptOutputOption();
        if (shouldSave) {
          const defaultFileName = `transcript_${getCurrentDateTime()}.txt`;
          const outputPath = await getLocalDirectoryPath(defaultFileName);
          await saveResultToFile(result.content, outputPath);
          console.log(`\nSaved transcript to: ${outputPath}`);
        } else {
          console.log('\nTranscript:');
          console.log(result.content);
        }
      }
    } catch (error) {
      console.error(warning(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });
