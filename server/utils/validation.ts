/**
 * Validation utilities for ID handling
 */

/**
 * Validates and converts an ID from unknown type to number
 * @param id - The ID to validate
 * @returns The validated ID as a number, or null if invalid
 */
export function validateId(id: unknown): number | null {
  if (typeof id === 'number') {
    return id;
  }
  if (typeof id === 'string') {
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Validates and converts an array of IDs from unknown type to numbers
 * @param ids - The IDs to validate
 * @returns Array of validated IDs as numbers
 */
export function validateIds(ids: unknown[]): number[] {
  return ids
    .map(id => validateId(id))
    .filter((id): id is number => id !== null);
}

/**
 * Validates a user ID from unknown type to number
 * @param userId - The user ID to validate
 * @returns The validated user ID as a number, or null if invalid
 */
export function validateUserId(userId: unknown): number | null {
  return validateId(userId);
}

