import { Request, Response } from "express";

export default async function (req: Request, res: Response) {
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
  
    let counter = 0;
    let interValID = setInterval(() => {
      counter++;
      if (counter >= 10) {
        clearInterval(interValID);
        res.end();
        return;
      }
      res.write(`data: ${JSON.stringify({ num: counter })}\n\n`);
    }, 1000);
  
    res.on("close", () => {
      console.log("client dropped me");
      clearInterval(interValID);
      res.end();
    });
  }