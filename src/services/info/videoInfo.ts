import { InternalServerError, BadRequestError } from "../../utils/errorHandling.js";
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
  try {
    if (!url.includes('?v=')) {
      throw new BadRequestError("Invalid YouTube URL format");
    }

    const id = url.split("?v=")[1]?.split('&')[0];
    if (!id) {
      throw new BadRequestError("Could not extract video ID from URL");
    }

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) {
      throw new InternalServerError("YouTube API key is not configured");
    }

    console.log('Fetching video info for ID:', id);
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${id}&key=${YOUTUBE_API_KEY}&part=snippet`
    );

    if (!response.ok) {
      console.error('YouTube API error:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new InternalServerError("Failed to fetch video info from YouTube");
    }

    const data = await response.json() as YouTubeApiResponse;
    console.log('YouTube API response:', data);

    if (!data.items?.length) {
      throw new BadRequestError("Video not found or is unavailable");
    }

    const snippet = data.items[0].snippet;
    if (!snippet) {
      throw new BadRequestError("Video data is incomplete");
    }

    const { title, description, thumbnails, channelTitle } = snippet;

    if (!thumbnails?.medium) {
      throw new BadRequestError("Video thumbnail not available");
    }

    const trimmedDescription = shortenString(description || '', 200);
    const mediumThumbnail = thumbnails.medium;

    return { id, title, trimmedDescription, mediumThumbnail, channelTitle };
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof InternalServerError) {
      throw error;
    }
    console.error('Unexpected error in videoInfo:', error);
    throw new InternalServerError(`An error occurred fetching video info: ${error instanceof Error ? error.message : String(error)}`);
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
