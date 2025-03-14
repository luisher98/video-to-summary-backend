import { InternalServerError, BadRequestError } from "@/utils/errors/index.js";
import { processTimer, logRequest, logProcessStep } from "@/utils/logging/logger.js";
import { YouTubeApiResponse } from "./videoInfo.types.js";

/**
 * Fetches and formats video metadata from YouTube Data API.
 * 
 * @param {string} url - YouTube video URL
 * @returns {Promise<VideoInfo>} Formatted video metadata
 * @throws {BadRequestError} If URL is invalid
 * @throws {InternalServerError} If API request fails
 * 
 * @example
 * const info = await videoInfo('https://youtube.com/watch?v=...');
 * console.log(info.title, info.channelTitle);
 */
export default async function videoInfo(url: string) {
  processTimer.startProcess('video-info');
  logProcessStep('video-info', 'start', { url });

  try {
    // URL validation
    processTimer.startProcess('url-validation');
    if (!url.includes('?v=')) {
      throw new BadRequestError("Invalid YouTube URL format");
    }

    const id = url.split("?v=")[1]?.split('&')[0];
    if (!id) {
      throw new BadRequestError("Could not extract video ID from URL");
    }
    processTimer.endProcess('url-validation');

    // API key validation
    processTimer.startProcess('api-validation');
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) {
      throw new InternalServerError("YouTube API key is not configured");
    }
    processTimer.endProcess('api-validation');

    // Fetch video data
    processTimer.startProcess('api-fetch');
    logProcessStep('api-fetch', 'start', { videoId: id });
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${id}&key=${YOUTUBE_API_KEY}&part=snippet,contentDetails`
    );

    if (!response.ok) {
      logProcessStep('api-fetch', 'error', {
        status: response.status,
        statusText: response.statusText
      });
      throw new InternalServerError("Failed to fetch video info from YouTube");
    }

    const data = await response.json() as YouTubeApiResponse;
    processTimer.endProcess('api-fetch');
    logProcessStep('api-fetch', 'complete', { videoId: id });

    // Process response
    processTimer.startProcess('data-processing');
    if (!data.items?.length) {
      throw new BadRequestError("Video not found or is unavailable");
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;

    // Parse duration from PT1H2M10S format to seconds
    const duration = parseDuration(contentDetails.duration);

    const result = {
      id,
      title: snippet.title,
      description: shortenString(snippet.description, 500),
      thumbnailUrl: snippet.thumbnails.medium.url,
      channel: snippet.channelTitle,
      duration
    };

    processTimer.endProcess('data-processing');
    processTimer.endProcess('video-info');

    logRequest({
      event: 'video_info_fetched',
      videoId: id,
      processTimings: processTimer.getTimings()
    });

    return result;
  } catch (error) {
    // End any active processes
    ['data-processing', 'api-fetch', 'api-validation', 'url-validation', 'video-info'].forEach(process => {
      try {
        processTimer.endProcess(process, error instanceof Error ? error : new Error(String(error)));
      } catch {
        // Process might not have been started
      }
    });

    logRequest({
      event: 'video_info_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      url,
      processTimings: processTimer.getTimings()
    });

    if (error instanceof BadRequestError || error instanceof InternalServerError) {
      throw error;
    }
    throw new InternalServerError("Failed to process video info", "VIDEO_INFO_ERROR", { originalError: error });
  }
}

/**
 * Truncates a string to a maximum length and adds ellipsis
 * 
 * @param {string} str - The string to shorten
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} The shortened string
 * @private
 */
function shortenString(str: string, maxLength: number): string {
  if (str.length > maxLength) {
    return str.substring(0, maxLength) + "...";
  }
  return str;
}

/**
 * Parses YouTube duration format (PT1H2M10S) to seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const [, hours, minutes, seconds] = match;
  return (parseInt(hours || '0') * 3600) + 
         (parseInt(minutes || '0') * 60) + 
         parseInt(seconds || '0');
}
