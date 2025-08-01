import process from 'process';

export function getEnvVar(key: string): string {
    const value = process.env[key];
    if (value === undefined || value === '') throw new Error(`Missing environment variable ${key}`);
    return value;
}
