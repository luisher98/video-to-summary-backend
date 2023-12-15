import { downloadVideo, deleteVideo } from "./videoTools.mjs";
import { generateTranscript, generateSummary } from "./openAI.mjs";

// noop function to pass to outputSummary. if a function is not passed, it will work without any issues
// , updateProgress = () => {}
async function outputSummary(url, words) {
  if (typeof url !== "string" || !url.includes("?v=")) {
    throw new Error("Invalid YouTube URL");
  }
  const id = url.split("=")[1].split("?")[0];

  try {
    // 1. Download video from YouTube
    // updateProgress({ status: "progress", message: "Downloading video..." });
    await downloadVideo(url, id);

    // 2. Generate transcript
    // updateProgress({ status: "progress", message: "Generating transcript..." });
    const transcript = await generateTranscript(id);

    // make deleteVideo and generateSummary run in parallel, so it doesnt have to wait for one to finish before starting the other
    // updateProgress({
    //   status: "progress",
    //   message: "Almost done!\nGenerating summary...",
    // });
    const [_, summary] = await Promise.all([
      // 3. Delete video
      deleteVideo(id),
      // 4. Generate summary
      generateSummary(transcript, words),
    ]);

    return summary;
  } catch (error) {
    console.error("Error during video processing: ", error);
  }
}

export default outputSummary;
