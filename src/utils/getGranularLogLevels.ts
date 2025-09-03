import process from 'process';

/**
 * Gets all log levels from both legacy and new environment variable formats
 */
export function getGranularLogLevels(): Record<string, string> {
    const logLevels: Record<string, string> = {};
    const LOG_LEVEL_PREFIX = 'LOGGER_LOG_LEVEL_';

    Object.keys(process.env).forEach(key => {
        if (key.startsWith(LOG_LEVEL_PREFIX) && key !== 'LOGGER_LOG_LEVEL_DEFAULT') {
            const componentName = key.substring(LOG_LEVEL_PREFIX.length);
            const level = process.env[key]; // Direct access is more reliable than getOptionalEnvVar

            if (componentName && level) {
                logLevels[componentName] = level;
                console.log(
                    `[getGranularLogLevels] Component-specific log level: ${componentName}=${level}`,
                );
            }
        }
    });

    return logLevels;
}
