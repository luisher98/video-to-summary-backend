import { Request, Response } from "express";
import { outputSummary } from "../../services/summary/outputSummary.ts";
import { BadRequestError } from "../../utils/errorHandling.ts";

export default async function getSummary(req: Request, res: Response) {
    const inputUrl = req.query.url as string;

    if (!inputUrl || !inputUrl.includes("?v=")) {
      return new BadRequestError("Invalid YouTube URL");
    }
  
    try {
      const transcript = await outputSummary({url: inputUrl, returnTranscriptOnly: true});
      res.json({ content: transcript });
      console.log("Transcript generated successfully.");
    } catch (error) {
      console.error(error);
    }
  }