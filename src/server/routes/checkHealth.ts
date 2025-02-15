import { Router } from 'express';
import fs from 'fs/promises';
import { getFfmpegPath, VIDEO_DOWNLOAD_PATH } from '../../utils/utils.js';
import youtubedl from 'youtube-dl-exec';
import { checkOpenAIConnection } from '../../lib/openAI.js';

const router = Router();

interface HealthDetails {
    ffmpegPath?: string;
    ffmpegError?: string;
    youtubeDlVersion?: string;
    youtubeDlError?: string;
    writeAccessError?: string;
    openAIError?: string;
}

interface HealthCheck {
    status: 'ok' | 'error';
    timestamp: string;
    uptime: number;
    checks: {
        ffmpeg: boolean;
        youtubeDl: boolean;
        writeAccess: boolean;
        openai: boolean;
    };
    details: HealthDetails;
}

router.get('/health', async (req, res) => {
    try {
        const health: HealthCheck = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            checks: {
                ffmpeg: false,
                youtubeDl: false,
                writeAccess: false,
                openai: false
            },
            details: {}
        };

        // Check ffmpeg
        try {
            const ffmpegPath = getFfmpegPath();
            await fs.access(ffmpegPath);
            health.checks.ffmpeg = true;
            health.details.ffmpegPath = ffmpegPath;
        } catch (err) {
            health.details.ffmpegError = err instanceof Error ? err.message : 'Unknown error';
        }

        // Check youtube-dl
        try {
            const version = await youtubedl.exec('--version');
            health.checks.youtubeDl = true;
            health.details.youtubeDlVersion = version.stdout;
        } catch (err) {
            health.details.youtubeDlError = err instanceof Error ? err.message : 'Unknown error';
        }

        // Check write access
        try {
            const testFile = `${VIDEO_DOWNLOAD_PATH}/test.txt`;
            await fs.mkdir(VIDEO_DOWNLOAD_PATH, { recursive: true });
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
            health.checks.writeAccess = true;
        } catch (err) {
            health.details.writeAccessError = err instanceof Error ? err.message : 'Unknown error';
        }

        // Check OpenAI connection
        try {
            health.checks.openai = await checkOpenAIConnection();
            if (!health.checks.openai) {
                health.details.openAIError = 'Failed to connect to OpenAI API';
            }
        } catch (err) {
            health.details.openAIError = err instanceof Error ? err.message : 'Unknown error';
        }

        const statusCode = Object.values(health.checks).every(check => check) ? 200 : 500;
        health.status = statusCode === 200 ? 'ok' : 'error';
        
        res.status(statusCode).json(health);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router; 