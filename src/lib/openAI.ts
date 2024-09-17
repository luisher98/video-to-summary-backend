import fs from 'fs';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { VIDEO_DOWNLOAD_PATH } from '../utils/utils.ts';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

(async function checkConectionToOpenAI() {
    const headers = new Headers({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
    });

    const payload = {
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: 'You are a helpful assistant.',
            },
            {
                role: 'user',
                content:
                    'Write a haiku that explains the concept of recursion.',
            },
        ],
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }
})();

const openai = new OpenAI({ apiKey });

export async function generateTranscript(id: string): Promise<string> {
    console.log('Generating transcript...');
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(`${VIDEO_DOWNLOAD_PATH}/${id}.mp3`),
            model: 'whisper-1',
        });

        const data = transcription.text;
        return data;
    } catch (error) {
        throw new Error(`there was an issue transcribing the audio (${error})`);
    }
}

export async function generateSummary(
    transcript: string,
    wordCount: number = 400,
    extraMessage = 'Touch on the main point.',
): Promise<string> {
    const assistantMessage =
        'You are a helpful assistant that will return a summary of the provided transcript.';
    const userMessage = `Return a summary of ${wordCount} words for the following transcript: ${transcript}. ${extraMessage}`;

    try {
        const response = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: assistantMessage },
                { role: 'user', content: userMessage },
            ],
            model: 'gpt-4o-mini',
            n: 1,
            temperature: 0.3,
        });

        const data = response.choices[0].message.content;

        if (!data) {
            throw new Error('no summary was generated');
        }

        return data;
    } catch (error) {
        throw new Error(
            `there was an error summarizing the transcript (${error}).`,
        );
    }
}
