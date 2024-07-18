import fs from "fs/promises";
import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";


function getFfmpegPath(): string {
  const path = process.env.FFMPEG_PATH ?? ffmpegPath;
  if (!path) {
    throw new Error('FFMPEG_PATH is not defined and fallback path is unavailable.');
  }
  return path;
}

// Set ffmpeg path
ffmpeg.setFfmpegPath(getFfmpegPath());

async function downloadVideo(videoUrl: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof videoUrl !== 'string' || typeof id !== 'string') {
        throw new Error('Invalid input types');
      }
      // Download video from YouTube
      let video = ytdl(videoUrl, {
        quality: "lowest",
        filter: "audioonly",
      });
      video.on('error', (error: Error) => {
        throw error;
      });
      // Convert the stream to mp3
      ffmpeg(video)
        .audioCodec("libmp3lame")
        .toFormat("mp3")
        .save(`${id}.mp3`)
        .on("error", (err: Error) => console.log(`Error during conversion: ${err.message}`))
        .on("end", () => {
          resolve();
        });
    } catch (error) {
      console.error("Error downloading the video: ", (error as Error).message);
      reject(error);
    }
  });
}

async function deleteVideo(id: string): Promise<void> {
  try {
    await fs.unlink(`./${id}.mp3`);
  } catch (error) {
    console.error("Error deleting the video: ", (error as Error).message);
  }
}

export { downloadVideo, deleteVideo };
