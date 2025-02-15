import { getServerStatus } from '../../server/server.js';
import { blue, green, red } from '../style/colors.js';
import { formatDuration } from '../../utils/formatters/dateTime.js';

/**
 * Displays current server status including uptime and active requests.
 * 
 * @returns {Promise<void>}
 * @throws {Error} If unable to retrieve server status
 * 
 * @example
 * await handleStatusCommand();
 * // Server Status:
 * // Running: Yes
 * // URL: http://localhost:5050
 * // Uptime: 2h 30m
 * // Active Requests: 1
 */
export async function handleStatusCommand(): Promise<void> {
    try {
        const status = getServerStatus();
        console.log(blue('\nServer Status:'));
        console.log(`Running: ${status.running ? green('Yes') : red('No')}`);
        if (status.running) {
            console.log(`URL: ${status.url}:${status.port}`);
            console.log(`Uptime: ${formatDuration(status.uptime)}`);
            console.log(`Active Requests: ${status.activeRequests}`);
        }
    } catch (error) {
        console.error('Error retrieving server status:', (error as Error).message);
    }
}
