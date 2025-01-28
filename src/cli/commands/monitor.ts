import { blue, green, red, yellow } from '../style/colors.ts';
import { activeRequests } from '../../server/server.ts';
import { formatBytes, formatDuration } from '../utils/utils.ts';
import os from 'os';

interface ServerStats {
    uptime: number;
    activeRequests: number;
    memory: {
        total: number;
        used: number;
        free: number;
    };
    cpuUsage: number;
}

let monitoring = false;
let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

function getCpuUsage(): number {
    const currentCpuUsage = process.cpuUsage(lastCpuUsage);
    const currentTime = Date.now();
    const timeDiff = currentTime - lastCpuTime;
    
    const totalUsage = (currentCpuUsage.user + currentCpuUsage.system) / 1000; // Convert to ms
    const cpuPercentage = (totalUsage / (timeDiff * os.cpus().length)) * 100;
    
    lastCpuUsage = process.cpuUsage();
    lastCpuTime = currentTime;
    
    return Math.min(100, Math.max(0, cpuPercentage));
}

function getServerStats(): ServerStats {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    return {
        uptime: process.uptime(),
        activeRequests: activeRequests.size,
        memory: {
            total: totalMemory,
            used: totalMemory - freeMemory,
            free: freeMemory
        },
        cpuUsage: getCpuUsage()
    };
}

function displayStats(stats: ServerStats): void {
    console.clear();
    console.log(blue('=== Server Monitor ==='));
    console.log(`Uptime: ${formatDuration(stats.uptime)}`);
    
    // Active Requests
    const requestColor = stats.activeRequests > 5 ? red : stats.activeRequests > 2 ? yellow : green;
    console.log(`Active Requests: ${requestColor(stats.activeRequests.toString())}`);
    
    // Memory Usage
    const memoryPercentage = (stats.memory.used / stats.memory.total) * 100;
    const memoryColor = memoryPercentage > 80 ? red : memoryPercentage > 60 ? yellow : green;
    console.log('Memory Usage:');
    console.log(`  Total: ${formatBytes(stats.memory.total)}`);
    console.log(`  Used:  ${memoryColor(formatBytes(stats.memory.used))} (${memoryColor(memoryPercentage.toFixed(1))}%)`);
    console.log(`  Free:  ${formatBytes(stats.memory.free)}`);
    
    // CPU Usage
    const cpuColor = stats.cpuUsage > 80 ? red : stats.cpuUsage > 60 ? yellow : green;
    console.log(`CPU Usage: ${cpuColor(stats.cpuUsage.toFixed(1))}%`);
    
    console.log('\nPress Ctrl+C to stop monitoring');
}

export async function handleMonitorCommand(): Promise<void> {
    if (monitoring) {
        console.log(yellow('Monitoring is already running'));
        return;
    }
    
    monitoring = true;
    console.log(blue('Starting server monitoring...'));
    
    const monitorInterval = setInterval(() => {
        const stats = getServerStats();
        displayStats(stats);
    }, 1000);
    
    process.on('SIGINT', () => {
        clearInterval(monitorInterval);
        monitoring = false;
        console.log(blue('\nMonitoring stopped'));
        process.exit(0);
    });
} 