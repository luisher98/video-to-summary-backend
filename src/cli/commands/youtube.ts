import { outputSummary } from '../../services/summary/outputSummary.ts';
import { ProgressUpdate } from '../../types/global.types.ts';
import { BadRequestError } from '../../utils/errorHandling.ts';

export async function handleYouTubeCommand(url: string, words: string) {
  if (!url || !words) {
    console.error("Usage: youtube <url> <words>");
    return;
  }

  const numWords = parseInt(words);
  if (isNaN(numWords) || numWords <= 0) {
    throw new BadRequestError("Words must be a positive integer.");
  }

  try {
    console.log('Processing YouTube video summary...');
    
    // Progress update callback
    const updateProgress = (progress: ProgressUpdate) => {
      console.log(`Progress: ${progress.message}`);
    };

    const summary = await outputSummary(url, numWords, updateProgress);
    console.log('Summary generated:');
    console.log(summary);

  } catch (error) {
    console.error('Error during summary generation:', error.message);
  }
}
