import { Router } from 'express';
import fs from 'fs/promises';
import { getFfmpegPath, VIDEO_DOWNLOAD_PATH } from '../../utils/utils.js';
import youtubedl from 'youtube-dl-exec';

const router = Router();

interface HealthDetails {
    ffmpegPath?: string;
    ffmpegError?: string;
    youtubeDlVersion?: string;
    youtubeDlError?: string;
    writeAccessError?: string;
}

interface HealthCheck {
    status: 'ok' | 'error';
    timestamp: string;
    checks: {
        ffmpeg: boolean;
        youtubeDl: boolean;
        writeAccess: boolean;
    };
    details: HealthDetails;
}

router.get('/health', async (req, res) => {
    try {
        const health: HealthCheck = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            checks: {
                ffmpeg: false,
                youtubeDl: false,
                writeAccess: false
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

        const statusCode = Object.values(health.checks).every(check => check) ? 200 : 500;
        res.status(statusCode).json(health);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router; 