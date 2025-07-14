import dotenv from 'dotenv';
import OpenAI from 'openai';
import { config } from '@/config/environment.js';
import { TempPaths } from '@/config/paths.js';
import { Readable } from 'stream';
import fs from 'fs';

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
 * Generates a transcript from an audio stream
 * @param stream Audio stream to transcribe
 * @param id Identifier for the stream
 * @returns Promise with the transcript text
 */
export async function generateTranscriptFromStream(
    stream: Readable,
    id: string
): Promise<string> {
    let tempFilePath = '';
    try {
        // First, buffer the stream to a temporary file
        // Note: OpenAI API doesn't currently support direct streaming for transcription
        tempFilePath = `${TempPaths.AUDIOS}/${id}-temp.mp3`;
        const writeStream = fs.createWriteStream(tempFilePath);
        
        console.log(`Starting stream write to: ${tempFilePath}`);
        
        // Track bytes written
        let bytesWritten = 0;
        
        await new Promise<void>((resolve, reject) => {
            stream.on('data', (chunk) => {
                bytesWritten += chunk.length;
            });
            
            stream.pipe(writeStream)
                .on('finish', () => {
                    console.log(`Stream write finished. Bytes written: ${bytesWritten}`);
                    // Add a small delay to ensure file is fully flushed
                    setTimeout(() => resolve(), 100);
                })
                .on('error', (err) => {
                    console.error('Stream write error:', err);
                    reject(err);
                });
        });
        
        // Validate the file was written successfully
        const stats = await fs.promises.stat(tempFilePath);
        console.log(`Temp file stats: size=${stats.size} bytes, exists=${stats.isFile()}`);
        
        if (stats.size === 0) {
            throw new Error('Generated audio file is empty');
        }
        
        if (stats.size < 1000) { // Less than 1KB is suspicious for an audio file
            console.warn(`Audio file is very small: ${stats.size} bytes`);
        }
        
        // Check if file size exceeds OpenAI's limit (25MB = 26,214,400 bytes)
        const OPENAI_MAX_SIZE = 26 * 1024 * 1024; // 26MB to be safe
        if (stats.size > OPENAI_MAX_SIZE) {
            throw new Error(`Audio file size (${(stats.size / 1024 / 1024).toFixed(1)}MB) exceeds OpenAI's maximum limit of 25MB. Please try a shorter video or contact support for larger file processing.`);
        }
        
        console.log(`Sending ${stats.size} byte MP3 file to OpenAI transcription`);
        
        // Use the file for transcription
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: 'whisper-1'
        });
        
        console.log(`Transcription completed successfully: ${transcription.text.length} characters`);
        
        // Clean up the temporary file
        try {
            await fs.promises.unlink(tempFilePath);
            console.log(`Cleaned up temporary file: ${tempFilePath}`);
        } catch (error) {
            console.warn(`Failed to clean up temporary file ${tempFilePath}:`, error);
        }
        
        return transcription.text;
    } catch (error) {
        console.error('Streaming transcription error:', error);
        
        // Try to clean up the temp file on error
        if (tempFilePath) {
            try {
                await fs.promises.unlink(tempFilePath);
            } catch (cleanupError) {
                console.warn(`Failed to clean up temp file after error: ${cleanupError}`);
            }
        }
        
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
