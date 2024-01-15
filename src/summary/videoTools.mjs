import fs from "fs/promises";
import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || ffmpegPath);

async function downloadVideo(videoUrl, id) {
  return new Promise((resolve, reject) => {
    try {
      // if (typeof videoUrl !== 'string' || typeof id !== 'string') {
      //   throw new Error('Invalid input types');
      // }
      // Download video from YouTube
      let video = ytdl(videoUrl, {
        quality: "lowest",
        filter: "audioonly",
      });
      video.on('error', error => {
        throw error;
      });
      // Convert the stream to mp3
      ffmpeg(video)
        .audioCodec("libmp3lame")
        .toFormat("mp3")
        .save(`${id}.mp3`)
        .on("error", (err) => console.log(`Error during conversion: ${err.message}`))
        .on("end", () => {
          resolve();
        });
    } catch (error) {
      console.error("Error downloading the video: ", error.message);
      reject(error);
    }
  });
}

async function deleteVideo(id) {
  try {
    await fs.unlink(`./${id}.mp3`);
  } catch (error) {
    console.error("Error deleting the video: ", error.message);
  }
}

export { downloadVideo, deleteVideo };
