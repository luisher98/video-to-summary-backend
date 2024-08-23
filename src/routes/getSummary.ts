import { Request, Response } from "express";
import { outputSummary } from "../services/summary/outputSummary.ts";

export default async function getSummary(req: Request, res: Response) {
    const inputUrl = req.query.url as string;
    const words = Number(req.query.words) as number;
  
    try {
      const summary = await outputSummary(inputUrl, words);
      res.json({ content: summary });
      console.log("Summary generated successfully.");
    } catch (error) {
      console.error(error);
      // code 500 is internal server error
      res.status(500).json({ error: "An error occurred" });
    }
  }