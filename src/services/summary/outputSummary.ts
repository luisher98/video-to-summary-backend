import { downloadVideo, deleteVideo } from "./videoTools.ts";
import { generateTranscript, generateSummary } from "../../lib/openAI.ts";
import { ProgressUpdate } from "../../types/global.types.ts";
import { BadRequestError, InternalServerError } from "../../utils/errorHandling.ts";

interface OutputSummaryOptions {
  url: string;
  words?: number;
  updateProgress?: (progress: ProgressUpdate) => void;
  additionalPrompt?: string;
  returnTranscriptOnly?: boolean;
}

export async function outputSummary({
  url,
  words = 400,
  updateProgress = () => {}, // Default is a no-op function
  additionalPrompt = "",
  returnTranscriptOnly = false,
}: OutputSummaryOptions): Promise<string> {
  if (typeof url !== "string" || !url.includes("?v=")) {
    throw new BadRequestError("Invalid YouTube URL");
  }
  const id = url.split("=")[1].split("?")[0];

  try {
    // 1. Download video from YouTube and convert to mp3
    updateProgress({ status: "pending", message: "Downloading video..." });
    await downloadVideo(url, id);

    // 2. Generate transcript
    updateProgress({ status: "pending", message: "Generating transcript..." });
    const transcript = await generateTranscript(id);

    // If returnTranscriptOnly flag is set, return the transcript without generating summary
    if (returnTranscriptOnly) {
      await deleteVideo(id);
      return transcript;
    }

    // 3. Generate summary and delete the video in parallel
    updateProgress({ status: "pending", message: "Almost done! Generating summary..." });
    const [_, summary] = await Promise.all([
      deleteVideo(id),
      generateSummary(transcript, words, additionalPrompt),
    ]);

    return summary;
  } catch (error) {
    console.error("Error during video processing: ", error);
    throw new InternalServerError(`Something went wrong during video processing: ${error}`);
  }
}
