import fs from 'fs';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { config } from '@/config/environment.js';
import { TempPaths } from '@/config/paths.js';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
}

// Initialize OpenAI client
const openai = new OpenAI({ apiKey });
checkOpenAIConnection().catch(console.error);

/**
 * Checks if OpenAI connection is working
 */
export async function checkOpenAIConnection(): Promise<boolean> {
    try {
        const models = await openai.models.list();
        return models.data.length > 0;
    } catch (error) {
        console.error('OpenAI connection check failed:', error);
        return false;
    }
}

/**
 * Generates a transcript from an audio file
 */
export async function generateTranscript(id: string): Promise<string> {
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(`${TempPaths.AUDIOS}/${id}.mp3`),
            model: 'whisper-1'
        });
        return transcription.text;
    } catch (error) {
        console.error('Transcription error:', error);
        throw error;
    }
}

/**
 * Generates a summary of a transcript using OpenAI's GPT model.
 * 
 * @param {string} transcript - Text to summarize
 * @param {number} wordCount - Maximum words in summary
 * @param {string} [additionalPrompt=''] - Additional instructions for the AI
 * @returns {Promise<string>} Generated summary
 * @throws {Error} If summary generation fails
 */
export async function generateSummary(
    transcript: string,
    wordCount: number,
    additionalPrompt = '',
): Promise<string> {
    const assistantMessage =
        'You are a helpful assistant that will return a summary of the provided transcript.';
    const userMessage = `Return a summary of ${wordCount} words for the following transcript: ${transcript}. ${additionalPrompt}`;

    try {
        const response = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: assistantMessage },
                { role: 'user', content: userMessage },
            ],
            model: 'gpt-3.5-turbo',
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
