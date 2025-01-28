import { Request, Response } from "express";
import videoInfo from "../../services/info/videoInfo.js";

/**
 * Endpoint to fetch metadata about a YouTube video.
 * 
 * @param {Request} req - Express request object with query parameters:
 *   - url: YouTube video URL
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with video metadata
 * 
 * @example
 * GET /api/info?url=https://youtube.com/watch?v=...
 * 
 * // Response:
 * {
 *   "id": "video_id",
 *   "title": "Video Title",
 *   "description": "Truncated description...",
 *   "thumbnail": { url, width, height },
 *   "channel": "Channel Name"
 * }
 */
export default async function getVideoInfo(req: Request, res: Response) {
    const inputUrl = req.query.url as string;
  
    try {
      const { id, title, mediumThumbnail, trimmedDescription, channelTitle } =
        await videoInfo(inputUrl);
      res.json({
        id: id,
        title: title,
        description: trimmedDescription,
        thumbnail: mediumThumbnail,
        channel: channelTitle,
      });
      console.log("Youtube info generated successfully.");
    } catch (error) {
      console.error(error);
    }
  }