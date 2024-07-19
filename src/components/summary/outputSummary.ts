import { downloadVideo, deleteVideo } from "./videoTools.js";
import { generateTranscript, generateSummary } from "../../lib/openAI.js";

import { ProgressUpdate } from "../../types/global.types.js";

// noop function to pass to outputSummary. if a function is not passed, it will work without any issues
export async function outputSummary(
  url: string,
  words: number,
  updateProgress: (progress: ProgressUpdate) => void = () => {}
): Promise<string> {
  if (typeof url !== "string" || !url.includes("?v=")) {
    throw new Error("Invalid YouTube URL");
  }
  const id = url.split("=")[1].split("?")[0];

  try {
    // 1. Download video from YouTube and convert to mp3
    updateProgress({ status: "pending", message: "Downloading video..." });
    await downloadVideo(url, id);

    // 2. Generate transcript
    updateProgress({ status: "pending", message: "Generating transcript..." });
    const transcript = await generateTranscript(id);

    // make deleteVideo and generateSummary run in parallel, so it doesnt have to wait for one to finish before starting the other
    updateProgress({status: "pending", message: "Almost done! Generating summary..."});
    const [_, summary] = await Promise.all([
      // 3. Delete video
      deleteVideo(id),
      // 4. Generate summary
      generateSummary(transcript, words),
    ]);

    return summary;
  } catch (error) {
    console.error("Error during video processing: ", error);
    throw new Error(`An error occurred: `);
  }
}
