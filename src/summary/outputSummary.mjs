import { webSocketServer } from "./../../app.js";

import { downloadVideo, deleteVideo } from "./videoTools.mjs";
import { generateTranscript, generateSummary } from "./openAI.mjs";

function sendMessage(message) {
  webSocketServer.clients.forEach((client) => client.send(message));
  console.log(message);
}

async function outputSummary(url, words) {
  const id = url.split("=")[1].split("?")[0];

try {
    // 1. Download video from YouTube
    sendMessage("Downloading video...");
    await downloadVideo(url, id);
    sendMessage("Video downloaded successfully.");
  
    // 2. Generate transcript
    sendMessage("Generating transcript...");
    const transcript = await generateTranscript(id);
    sendMessage("Transcript generated successfully.");
  
    // Make deleteVideo and generateSummary run in parallel, so it doesnt have to wait for one to finish before starting the other
    sendMessage("Generating summary... Almost done!");
    const [_, summary] = await Promise.all([
      // 3. Delete video
      deleteVideo(id),
      // 4. Generate summary
      generateSummary(transcript, words),
    ]);
  
    return summary;
} catch (error) {
  next(error)
}
}

export default outputSummary;
