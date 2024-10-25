import { downloadVideo, deleteVideo } from "./videoTools.ts";
import { generateTranscript, generateSummary} from "../../lib/openAI.ts";
import { ProgressUpdate } from "../../types/global.types.ts";
import { BadRequestError, InternalServerError } from "../../utils/errorHandling.ts";

export async function outputSummary(
  url: string,
  words: number = 400,
  // noop function to pass to outputSummary. if a function is not passed, it will work without any issues
  updateProgress: (progress: ProgressUpdate) => void = () => {},
  returnTranscriptOnly: boolean = false
): Promise<string> {
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


    if (returnTranscriptOnly) {
      await deleteVideo(id);
      return transcript;
    }

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
    throw new InternalServerError(`Something went wrong during video processing: ${error} `);
  }
}
