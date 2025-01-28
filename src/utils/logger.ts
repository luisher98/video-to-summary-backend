interface LogInfo {
    event: string;
    url: string;
    ip: string;
    userAgent?: string;
    duration?: number;
    error?: string;
    [key: string]: any;
}

export function logRequest(info: LogInfo): void {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        ...info,
        environment: process.env.NODE_ENV
    }));
} 