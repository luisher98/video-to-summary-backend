import { Request, Response } from "express";
import { outputSummary } from "../../services/summary/outputSummary.ts";
import { BadRequestError } from "../../utils/errorHandling.ts";

export default async function getSummary(req: Request, res: Response) {
    const inputUrl = req.query.url as string;
    const words = Number(req.query.words) as number;

    if (!inputUrl || !inputUrl.includes("?v=")) {
      return new BadRequestError("Invalid YouTube URL");
    }
  
    try {
      const summary = await outputSummary(inputUrl, words);
      res.json({ content: summary });
      console.log("Summary generated successfully.");
    } catch (error) {
      console.error(error);
    }
  }