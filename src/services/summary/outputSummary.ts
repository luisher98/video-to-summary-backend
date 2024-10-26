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
  updateProgress = () => {},
  additionalPrompt = "",
  returnTranscriptOnly = false,
}: OutputSummaryOptions): Promise<string> {
  if (typeof url !== "string" || !url.includes("?v=")) {
    throw new BadRequestError("Invalid YouTube URL");
  }
  const id = url.split("=")[1].split("?")[0];

  try {
    // 1. Download video from YouTube
    updateProgress({ status: "pending", message: "Downloading video..." });
    await downloadVideo(url, id);

    // 2. Generate transcript
    updateProgress({ status: "pending", message: "Generating transcript..." });
    const transcript = await generateTranscript(id);

    if (returnTranscriptOnly) {
      await deleteVideo(id); // Ensure deletion in case of early return
      return transcript;
    }

    // 3. Generate summary and delete video in parallel
    updateProgress({ status: "pending", message: "Generating summary..." });
    const [_, summary] = await Promise.all([
      deleteVideo(id), // Ensure video deletion happens even in case of error
      generateSummary(transcript, words, additionalPrompt),
    ]);

    return summary;
  } catch (error) {
    console.error("Error during video processing:", error);
    throw new InternalServerError(`Something went wrong during video processing: ${error}`);
  } finally {
    await deleteVideo(id); // Ensure cleanup in the finally block
  }
}
