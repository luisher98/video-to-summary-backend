import fs from 'fs';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { VIDEO_DOWNLOAD_PATH } from '../utils/utils.js';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

/**
 * Tests connection to OpenAI API by attempting a simple completion.
 * 
 * @returns {Promise<boolean>} True if connection is successful
 */
export async function checkOpenAIConnection() {
    if (process.env.NODE_ENV === 'test') return true;
    
    try {
        const headers = new Headers({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        });

        const payload = {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant.',
                },
                {
                    role: 'user',
                    content: 'Write a haiku that explains the concept of recursion.',
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
        return true;
    } catch (error) {
        console.error('Failed to connect to OpenAI:', error);
        return false;
    }
}

// Initialize OpenAI client
const openai = new OpenAI({ apiKey });
checkOpenAIConnection().catch(console.error);

/**
 * Generates a transcript from an audio file using OpenAI's Whisper model.
 * 
 * @param {string} id - File ID of the audio to transcribe
 * @returns {Promise<string>} Generated transcript text
 * @throws {Error} If transcription fails
 */
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
