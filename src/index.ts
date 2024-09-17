import express from "express";
import bodyParser from "body-parser";
// import rateLimit from "express-rate-limit";

import getVideoInfo from "./routes/getVideoInfo.ts";
import getSummary from "./routes/getSummary.ts";
import getSummarySSE from "./routes/getSummarySSE.ts";
import getTestSSE from "./routes/getTestSSE.ts";

const port = process.env.PORT || 5050;
const url = process.env.URL || "http://localhost";

const app = express();

app.use(bodyParser.json());

// const limiter = rateLimit({
//   windowMs: 60 * 1000,
//   max: 10,
// })

// app.use(limiter)


app.get("/api/info", getVideoInfo);
app.get("/api/summary", getSummary);
app.get("/api/summary-sse", getSummarySSE);
app.get("/api/test-sse", getTestSSE);

const server = app.listen(port, () => {
  console.log(`Server running on ${url}:${port}`);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  server.close(() => {
    process.kill(process.pid, 'SIGTERM');
  });
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  server.close(() => {
    process.kill(process.pid, 'SIGTERM');
  });
});
