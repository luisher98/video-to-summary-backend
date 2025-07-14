import chalk from 'chalk';

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

class ProcessTimer {
    private timings: Map<string, ProcessTiming> = new Map();
    private activeProcess: string | null = null;
    private readonly MAX_TIMINGS = 1000; // Prevent unlimited growth

    startProcess(processName: string): void {
        // Clear old timings if map gets too large
        if (this.timings.size > this.MAX_TIMINGS) {
            const entries = Array.from(this.timings.entries());
            // Keep only the most recent 500 entries
            this.timings.clear();
            entries.slice(-500).forEach(([key, value]) => {
                this.timings.set(key, value);
            });
        }

        const timing: ProcessTiming = {
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
            timing.duration = timing.endTime - timing.startTime;
            timing.status = error ? 'error' : 'completed';
            this.activeProcess = null;
        }
    }

    getTimings(): ProcessTiming[] {
        return Array.from(this.timings.values());
    }

    // NEW: Clear timings method
    clearTimings(): void {
        this.timings.clear();
        this.activeProcess = null;
    }

    // NEW: Clear old timings
    clearOldTimings(maxAgeMs: number = 300000): void { // 5 minutes default
        const now = performance.now();
        for (const [key, timing] of this.timings.entries()) {
            if (timing.endTime && (now - timing.endTime) > maxAgeMs) {
                this.timings.delete(key);
            }
        }
    }
}

export const processTimer = new ProcessTimer();

/**
 * Formats duration in a human-readable format
 */
function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(2)}m`;
}

/**
 * Generates a progress bar string
 */
function generateProgressBar(percentage: number, length: number = 20): string {
    // Ensure percentage is between 0 and 1
    const validPercentage = Math.max(0, Math.min(1, Number.isFinite(percentage) ? percentage : 0));
    const filled = Math.round(validPercentage * length);
    const empty = length - filled;
    return `[${('█').repeat(filled)}${('░').repeat(empty)}]`;
}

/**
 * Formats a size in bytes to human readable format
 */
function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

/**
 * Formats a process step with tree structure
 */
function formatProcessStep(step: string, level: number = 0, last: boolean = false): string {
    const indent = '  '.repeat(level);
    const prefix = level === 0 ? '' : last ? '└─ ' : '├─ ';
    return `${indent}${prefix}${step}`;
}

/**
 * Logs a process step with visual formatting
 */
export function logProcessStep(step: string, status: 'start' | 'complete' | 'error', details?: any): void {
    const icon = status === 'start' ? '→' : status === 'complete' ? '✓' : '✗';
    const color = status === 'start' ? chalk.blue : status === 'complete' ? chalk.green : chalk.red;
    
    // Get timing information if available
    const timing = processTimer.getTimings().find(t => t.processName === step);
    const durationStr = timing?.duration ? ` ${chalk.gray(`${formatDuration(timing.duration)}`)}` : '';
    
    // Format details more concisely
    let detailsStr = '';
    if (details) {
        if (typeof details === 'object') {
            if ('progress' in details) {
                detailsStr = ` ${generateProgressBar(details.progress / 100)}`;
            } else {
                // Only show the first key-value pair
                const firstKey = Object.keys(details)[0];
                if (firstKey) {
                    const value = details[firstKey];
                    if (firstKey === 'size') {
                        detailsStr = chalk.gray(` | ${formatSize(value)}`);
                    } else {
                        detailsStr = chalk.gray(` | ${firstKey}: ${value}`);
                    }
                }
            }
        } else {
            detailsStr = chalk.gray(` | ${details}`);
        }
    }
    
    console.log(`${color(icon)} ${step}${durationStr}${detailsStr}`);
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
        console.log(`Memory    ${formatSize(memoryUsage.heapUsed)}/${formatSize(memoryUsage.heapTotal)} ${chalk.gray(`(${(heapPercentage * 100).toFixed(1)}%)`)}`);
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