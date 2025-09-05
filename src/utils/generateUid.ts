import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique identifier using UUID v4.
 *
 * This utility provides a consistent way to generate unique IDs across the application,
 * replacing various ad-hoc implementations with a robust, cryptographically secure solution.
 *
 * @returns A unique string identifier in UUID v4 format
 *
 * @example
 * ```typescript
 * import { generateUid } from '../utils/generateUid';
 *
 * const watcherId = generateUid();
 * const subscriberId = generateUid();
 * ```
 */
export function generateUid(): string {
    return uuidv4();
}
