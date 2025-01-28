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
    const id = url.split("?v=")[1];

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${id}&key=${YOUTUBE_API_KEY}&part=snippet`
    );

    const data = await response.json() as YouTubeApiResponse;
    const snippet = data.items[0].snippet;

    if (!snippet) {
      throw new BadRequestError("Invalid video URL");
    }

    const { title, description, thumbnails, channelTitle } = snippet;

    function shortenString(str: string, maxLength: number): string {
      if (str.length > maxLength) {
        return str.substring(0, maxLength) + "...";
      }
      return str;
    }

    const trimmedDescription = shortenString(description, 200);

    const mediumThumbnail = thumbnails.medium;

    return { id, title, trimmedDescription, mediumThumbnail, channelTitle };
  } catch (error) {
    throw new InternalServerError(`An error occurred fetching video info (${error})`);
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
