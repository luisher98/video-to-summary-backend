import { Request, Response } from "express";
import videoInfo from "../services/info/videoInfo.ts";

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