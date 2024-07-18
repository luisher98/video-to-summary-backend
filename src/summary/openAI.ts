import fs from "fs";
import dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";

dotenv.config();

const configuration = new Configuration({
  organization: process.env.OPENAI_ORGANIZATION,
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function generateTranscript(id) {
  console.log("Generating transcript...");
  try {
    const transcription = await openai.createTranscription(
      fs.createReadStream(`./${id}.mp3`),
      "whisper-1",
      undefined,
      undefined,
      undefined,
      undefined,
      {
        maxBodyLength: Infinity,
      }
    );

    const data = transcription.data.text;
    return data;
  } catch (error) {
    console.error("Error transcribing the audio: ", error.message);
  }
}

async function generateSummary(transcript, wordCount = 400, extraMessage = "touch on the main points of the conversation.") {
  const message = `Return a summary of ${wordCount} words for the following transcript: ${transcript}. ${extraMessage}`;

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "assistant", content: message }],
      n: 1,
      stop: null,
      temperature: 0.3,
    });

    const data = response.data.choices[0].message.content;
    return data;
  } catch (error) {
    console.error("Error summarizing the transcript: ", error.message);
  }
}

export { generateTranscript, generateSummary };
