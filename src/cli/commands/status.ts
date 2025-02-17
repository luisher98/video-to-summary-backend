import { Command } from 'commander';
import { success, warning } from '../style/colors.js';
import { getQueueStatus } from '../../server/middleware/security/index.js';

export const status = new Command('status')
    .description('Check server status')
    .action(async () => {
        try {
            const { active, limit } = getQueueStatus();
            console.log(success(`Active Requests: ${active}/${limit}`));
        } catch (error) {
            console.error(warning(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
            process.exit(1);
        }
    });
