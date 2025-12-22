/**
 * Batch operation utilities
 */

import { validateIds } from './validation';

export interface BatchResult<T> {
  success: T[];
  failed: Array<{ id: number; error: string }>;
  total: number;
}

/**
 * Validates batch IDs from request
 * @param ids - The IDs to validate (from request body)
 * @returns Array of validated IDs as numbers
 */
export function validateBatchIds(ids: unknown[]): number[] {
  return validateIds(ids);
}

/**
 * Processes a batch operation on multiple IDs
 * @param ids - Array of IDs to process
 * @param operation - The operation to perform on each ID
 * @returns Batch result with success and failed items
 */
export async function processBatchOperation<T>(
  ids: number[],
  operation: (id: number) => Promise<T>
): Promise<BatchResult<T>> {
  const result: BatchResult<T> = {
    success: [],
    failed: [],
    total: ids.length
  };

  for (const id of ids) {
    try {
      const item = await operation(id);
      result.success.push(item);
    } catch (error) {
      result.failed.push({
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return result;
}

