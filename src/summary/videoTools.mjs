import fs from "fs/promises";

import ytdl from "ytdl-core";

import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath("usr/bin/ffmpeg");

async function downloadVideo(videoUrl, id) {
  return new Promise((resolve, reject) => {
    try {
      // Download video from YouTube
      console.log("Downloading video...");
      let video = ytdl(videoUrl, {
        quality: "lowest",
        filter: "audioonly",
      });
      console.log("Video downloaded successfully.");
      // Convert the stream to mp3
      console.log("Converting video to mp3...");
      ffmpeg(video)
        .audioCodec("libmp3lame")
        .toFormat("mp3")
        .save(`${id}.mp3`)
        .on("error", (err) => console.log(`Error: ${err.message}`))
        .on("end", () => {
          console.log("Audio downloaded and converted to MP3 successfully.");
          resolve();
        });
      console.log("Video converted to mp3 successfully.");
    } catch (error) {
      console.error("Error downloading the video: ", error.message);
      reject(error);
    }
  });
}

async function deleteVideo(id) {
  console.log("Deleting video...");
  try {
    await fs.unlink(`./${id}.mp3`);
    console.log("Video deleted successfully.");
  } catch (error) {
    console.error("Error deleting the video: ", error.message);
  }
}

export { downloadVideo, deleteVideo };
