import chalk from 'chalk';
import { formatDuration } from '../formatters/dateTime.js';

/**
 * Interface for process timing information
 */
export interface ProcessTiming {
    processName: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    subProcesses?: ProcessTiming[];
    status: 'running' | 'completed' | 'error';
    metadata?: { rate?: string };
}

/**
 * Interface for structured logging information
 */
export interface LogInfo {
    event: string;
    url?: string;
    ip?: string;
    userAgent?: string;
    duration?: number;
    error?: string;
    processTimings?: ProcessTiming[];
    [key: string]: any;
}

let lastProgressStep = '';

/**
 * Logs a process step with visual formatting
 */
export function logProcessStep(step: string, status: 'start' | 'complete' | 'error', details?: any): void {
    const icon = status === 'start' ? '→' : status === 'complete' ? '✓' : '✗';
    const color = status === 'start' ? chalk.blue : status === 'complete' ? chalk.green : chalk.red;
    
    // Format details more concisely
    let detailsStr = '';
    if (details) {
        if (typeof details === 'object') {
            if ('progress' in details) {
                detailsStr = ` ${generateProgressBar(details.progress / 100)}`;
            } else if ('kbDownloaded' in details) {
                detailsStr = chalk.gray(` | Downloaded: ${Number(details.kbDownloaded).toFixed(2)} KB`);
            } else {
                // Only show the first key-value pair
                const firstKey = Object.keys(details)[0];
                if (firstKey) {
                    const value = details[firstKey];
                    detailsStr = chalk.gray(` | ${firstKey}: ${value}`);
                }
            }
        } else {
            detailsStr = chalk.gray(` | ${details}`);
        }
    }

    const line = `${color(icon)} ${step}${detailsStr}`;

    // If this is a progress update, overwrite the previous line
    if (status === 'start' && (step.includes('Progress') || step.includes('Processing'))) {
        if (lastProgressStep !== step) {
            // If the step changed, print a newline before the new progress
            process.stdout.write('\n');
        }
        process.stdout.write('\r' + line);
        lastProgressStep = step;
    } else {
        // If the last line was a progress bar, print a newline before the next message
        if (lastProgressStep) {
            process.stdout.write('\n');
            lastProgressStep = '';
        }
        console.log(line);
    }
}

function generateProgressBar(percentage: number, length: number = 20): string {
    // Ensure percentage is between 0 and 1
    const validPercentage = Math.max(0, Math.min(1, Number.isFinite(percentage) ? percentage : 0));
    const filled = Math.round(validPercentage * length);
    const empty = length - filled;
    return `[${('█').repeat(filled)}${('░').repeat(empty)}]`;
}

/**
 * Logs the final process summary with timing information
 */
export function logProcessSummary(processTimings: ProcessTiming[]): void {
    console.log('\n⏱️  Process Timings:');
    
    // Calculate total duration
    const totalDuration = processTimings[0]?.duration || 0;
    console.log(`Total Time: ${chalk.cyan(formatDuration(totalDuration))}\n`);
    
    // Find the longest process name for padding
    const maxNameLength = Math.max(...processTimings.map(t => t.processName.length));
    
    // Filter out redundant steps and sort by start time
    const uniqueTimings = processTimings
        .filter(timing => {
            // Skip the overall Content Processing timing since we show total time
            if (timing.processName === 'Content Processing') return false;
            // Skip Media Extraction since it's the same as Download for YouTube
            if (timing.processName === 'Media Extraction') return false;
            return true;
        })
        .sort((a, b) => a.startTime - b.startTime);

    // Display timings
    uniqueTimings.forEach(timing => {
        if (timing.duration) {
            // Calculate percentage safely
            const percentage = totalDuration > 0 ? timing.duration / totalDuration : 0;
            const bar = generateProgressBar(percentage, 30);
            const duration = formatDuration(timing.duration);
            const percentStr = `${(percentage * 100).toFixed(1)}%`.padStart(5);
            const rate = timing.metadata?.rate ? ` │ ${chalk.gray(timing.metadata.rate)}` : '';
            console.log(`${chalk.bold(timing.processName.padEnd(maxNameLength))} ${bar} ${percentStr} │ ${chalk.cyan(duration)}${rate}`);
        }
    });
    
    // Only show resource usage if we have data
    if (processTimings.length > 0) {
        console.log('\n📊 Resource Usage:');
        const memoryUsage = process.memoryUsage();
        const heapPercentage = memoryUsage.heapUsed / memoryUsage.heapTotal;
        console.log(`Memory    ${chalk.gray(`(${(heapPercentage * 100).toFixed(1)}%)`)}`);
    }
    
    console.log('');
}

/**
 * Logs a request with structured information and process timings
 */
export function logRequest(info: LogInfo): void {
    if (process.env.NODE_ENV === 'test') return;
    
    const logData = {
        timestamp: new Date().toISOString(),
        ...info,
        environment: process.env.NODE_ENV
    };
    
    if (info.processTimings) {
        logProcessSummary(info.processTimings);
    }
    
    // Only log the structured data in development or if explicitly requested
    if (process.env.NODE_ENV === 'development' || process.env.LOG_STRUCTURED_DATA) {
        console.log(JSON.stringify(logData, null, 2));
    }
} 

// Add back processTimer for compatibility with other imports
class ProcessTimer {
    private timings: Map<string, any> = new Map();
    private activeProcess: string | null = null;
    private readonly MAX_TIMINGS = 1000;

    startProcess(processName: string): void {
        if (this.timings.size > this.MAX_TIMINGS) {
            const entries = Array.from(this.timings.entries());
            this.timings.clear();
            entries.slice(-500).forEach(([key, value]) => {
                this.timings.set(key, value);
            });
        }
        const timing = {
            processName,
            startTime: performance.now(),
            status: 'running',
            subProcesses: []
        };
        if (this.activeProcess) {
            const parentTiming = this.timings.get(this.activeProcess);
            if (parentTiming) {
                parentTiming.subProcesses?.push(timing);
            }
        }
        this.timings.set(processName, timing);
        this.activeProcess = processName;
    }

    endProcess(processName: string, error?: Error): void {
        const timing = this.timings.get(processName);
        if (timing) {
            timing.endTime = performance.now();
            timing.duration = (timing.endTime - timing.startTime) / 1000; // Convert to seconds
            timing.status = error ? 'error' : 'completed';
            this.activeProcess = null;
        }
    }

    getTimings(): any[] {
        return Array.from(this.timings.values());
    }

    clearTimings(): void {
        this.timings.clear();
        this.activeProcess = null;
    }

    clearOldTimings(maxAgeMs: number = 300000): void {
        const now = performance.now();
        for (const [key, timing] of this.timings.entries()) {
            if (timing.endTime && (now - timing.endTime) > maxAgeMs) {
                this.timings.delete(key);
            }
        }
    }
}

export const processTimer = new ProcessTimer(); 