import { checkOpenAIConnection } from '@/integrations/openAI.js';
import { createStorageService, StorageError, StorageErrorCode } from '../../services/storage/StorageService.js';
import { AZURE_STORAGE_CONFIG } from '@/config/azure.js';
import { config } from '@/config/environment.js';
import { initializeTempDirs } from '@/utils/file/tempDirs.js';
import clc from 'cli-color';
import fs from 'fs/promises';

interface ServiceStatus {
    name: string;
    status: 'ok' | 'error';
    error?: string;
}

/**
 * Validates required environment variables
 */
async function verifyEnvironment(): Promise<ServiceStatus> {
    try {
        // First check Azure-specific environment variables
        const azureVars = {
            'AZURE_STORAGE_ACCOUNT_NAME': process.env.AZURE_STORAGE_ACCOUNT_NAME,
            'AZURE_STORAGE_CONNECTION_STRING': process.env.AZURE_STORAGE_CONNECTION_STRING,
            'AZURE_STORAGE_CONTAINER_NAME': process.env.AZURE_STORAGE_CONTAINER_NAME
        };

        const missingAzureVars = Object.entries(azureVars)
            .filter(([_, value]) => !value || value.trim() === '')
            .map(([name]) => name);

        if (missingAzureVars.length > 0) {
            return {
                name: 'Environment',
                status: 'error',
                error: `Missing Azure environment variables: ${missingAzureVars.join(', ')}`
            };
        }

        // Then check other required variables
        const otherVars = {
            'OPENAI_API_KEY': config.openai.apiKey,
            'PORT': config.port.toString(),
            'NODE_ENV': config.nodeEnv
        };

        const missingOtherVars = Object.entries(otherVars)
            .filter(([_, value]) => !value || value.trim() === '')
            .map(([name]) => name);

        if (missingOtherVars.length > 0) {
            return {
                name: 'Environment',
                status: 'error',
                error: `Missing environment variables: ${missingOtherVars.join(', ')}`
            };
        }

        return {
            name: 'Environment',
            status: 'ok'
        };
    } catch (error) {
        return {
            name: 'Environment',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Verifies OpenAI connection by attempting a test API call
 */
async function verifyOpenAI(): Promise<ServiceStatus> {
    try {
        const isConnected = await checkOpenAIConnection();
        return {
            name: 'OpenAI',
            status: isConnected ? 'ok' : 'error',
            error: isConnected ? undefined : 'Failed to connect to OpenAI'
        };
    } catch (error) {
        return {
            name: 'OpenAI',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Verifies Azure Storage connection by validating configuration and testing connectivity
 */
async function verifyAzureStorage(): Promise<ServiceStatus> {
    try {
        // 1. Verify required Azure credentials are present
        const requiredCreds = {
            'AZURE_TENANT_ID': process.env.AZURE_TENANT_ID,
            'AZURE_CLIENT_ID': process.env.AZURE_CLIENT_ID,
            'AZURE_CLIENT_SECRET': process.env.AZURE_CLIENT_SECRET,
            'AZURE_STORAGE_ACCOUNT_NAME': process.env.AZURE_STORAGE_ACCOUNT_NAME,
            'AZURE_STORAGE_CONTAINER_NAME': process.env.AZURE_STORAGE_CONTAINER_NAME
        };

        const missingCreds = Object.entries(requiredCreds)
            .filter(([_, value]) => !value || value.trim() === '')
            .map(([name]) => name);

        if (missingCreds.length > 0) {
            return {
                name: 'Azure Storage',
                status: 'error',
                error: `Missing Azure credentials: ${missingCreds.join(', ')}`
            };
        }

        // 2. Attempt actual connection
        try {
            const storage = createStorageService(AZURE_STORAGE_CONFIG);
            await storage.initialize();
            return {
                name: 'Azure Storage',
                status: 'ok'
            };
        } catch (error) {
            if (error instanceof StorageError) {
                let errorMessage = 'Azure Storage connection failed: ';
                const storageError = error as StorageError;
                switch (storageError.code) {
                    case StorageErrorCode.INVALID_CREDENTIALS:
                        errorMessage += 'Invalid credentials - check your service principal credentials';
                        break;
                    case StorageErrorCode.CONTAINER_NOT_FOUND:
                        errorMessage += `Container '${process.env.AZURE_STORAGE_CONTAINER_NAME}' not found - verify container exists`;
                        break;
                    case StorageErrorCode.PERMISSION_DENIED:
                        errorMessage += 'Permission denied - verify service principal role assignments';
                        break;
                    case StorageErrorCode.UNAUTHORIZED:
                        errorMessage += 'Unauthorized - verify service principal has proper RBAC permissions';
                        break;
                    case StorageErrorCode.NOT_FOUND:
                        errorMessage += 'Container not found';
                        break;
                    default:
                        errorMessage += storageError.message;
                }
                return {
                    name: 'Azure Storage',
                    status: 'error',
                    error: errorMessage
                };
            }
            throw error; // Re-throw if it's not a StorageError
        }
    } catch (error) {
        return {
            name: 'Azure Storage',
            status: 'error',
            error: error instanceof Error ? 
                `Azure Storage initialization failed: ${error.message}` : 
                'Unknown Azure Storage error'
        };
    }
}

/**
 * Verifies temporary directories are properly initialized
 */
async function verifyPaths(): Promise<ServiceStatus> {
    try {
        await initializeTempDirs();
        return {
            name: 'Paths',
            status: 'ok'
        };
    } catch (error) {
        return {
            name: 'Paths',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Verifies all required services and displays their status
 */
export async function verifyServices(): Promise<void> {
    console.log('\n=== Service Verification ===');
    
    const services = await Promise.all([
        verifyEnvironment(),
        verifyPaths(),
        verifyOpenAI(),
        verifyAzureStorage()
    ]);

    // Get terminal width or default to 80
    const terminalWidth = process.stdout.columns || 80;
    const maxTableWidth = Math.min(terminalWidth - 4, 100);

    // Calculate column widths
    const nameColumnWidth = Math.max(
        ...services.map(s => s.name.length),
        'Service'.length
    );
    const statusColumnWidth = 8; // Width to accommodate "Status" and ERROR/OK
    const tableWidth = nameColumnWidth + statusColumnWidth + 7; // 7 for borders and padding

    // Helper function to create horizontal lines
    const createLine = (start: string, middle: string, separator: string, end: string) => 
        start + middle.repeat(nameColumnWidth + 2) + 
        separator + middle.repeat(statusColumnWidth + 2) + 
        end;

    // Create line styles
    const topLine = createLine('┌', '─', '┬', '┐');
    const headerLine = createLine('├', '─', '┼', '┤');
    const bottomLine = createLine('└', '─', '┴', '┘');

    // Print status table
    console.log(topLine);
    console.log(
        '│ ' + 
        'Service'.padEnd(nameColumnWidth) + 
        ' │ ' + 
        'Status'.padEnd(statusColumnWidth) + 
        ' │'
    );
    console.log(headerLine);

    // Print service statuses
    for (const service of services) {
        const status = service.status === 'ok' 
            ? clc.green('OK       ')
            : clc.red('ERROR    ');

        console.log(
            '│ ' + 
            service.name.padEnd(nameColumnWidth) +
            ' │ ' +
            status +
            '│'
        );
    }

    console.log(bottomLine);

    // Collect and display errors if any
    const failedServices = services.filter(s => s.status === 'error');
    if (failedServices.length > 0) {
        console.log('\nErrors Found:');
        console.log('─'.repeat(maxTableWidth));
        
        failedServices.forEach((service, index) => {
            console.log(clc.yellow(`\n${service.name}:`));
            if (service.error) {
                // Split error message into wrapped lines
                const errorLines = service.error
                    .split(' ')
                    .reduce((lines: string[], word: string) => {
                        const currentLine = lines[lines.length - 1];
                        if (!currentLine || (currentLine + ' ' + word).length > maxTableWidth - 4) {
                            lines.push(word);
                        } else {
                            lines[lines.length - 1] = currentLine + ' ' + word;
                        }
                        return lines;
                    }, []);

                // Print each line with proper indentation
                errorLines.forEach(line => {
                    console.log(`  ${line}`);
                });
            }
            
            // Add separator between errors, except for the last one
            if (index < failedServices.length - 1) {
                console.log('  ' + '─'.repeat(maxTableWidth - 4));
            }
        });
        
        console.log(); // Add final newline
        
        throw new Error(
            'Service verification failed:\n' +
            failedServices.map(s => `- ${s.name}: ${s.error}`).join('\n')
        );
    }
} 