/**
 * Get an environment variable with validation
 * @param name - Name of the environment variable
 * @throws Error if the environment variable is not set
 * @returns The value of the environment variable
 */
export function getEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Environment variable ${name} is not set.`);
    }
    return value;
} 