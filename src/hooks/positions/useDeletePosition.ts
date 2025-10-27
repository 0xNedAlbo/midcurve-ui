/**
 * useDeletePosition - React Query hook for deleting positions
 *
 * Protocol-agnostic delete mutation that accepts a protocol-specific endpoint.
 * Handles cache invalidation automatically on success.
 *
 * Usage:
 * ```typescript
 * const deletePosition = useDeletePosition({
 *   onSuccess: () => console.log('Position deleted'),
 *   onError: (error) => console.error(error),
 * });
 *
 * const endpoint = getDeleteEndpoint(position);
 * deletePosition.mutate({ endpoint, positionId: position.id });
 * ```
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { ApiError } from '@/lib/api-client';

interface DeletePositionParams {
  endpoint: string; // Protocol-specific DELETE endpoint
  positionId: string; // For logging and tracking
}

/**
 * Hook to delete a position
 */
export function useDeletePosition(
  options?: Omit<
    UseMutationOptions<void, ApiError, DeletePositionParams>,
    'mutationKey' | 'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['positions', 'delete'] as const,

    mutationFn: async ({ endpoint }: DeletePositionParams) => {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include', // Include session cookies
      });

      if (!response.ok) {
        const data = await response.json();
        throw new ApiError(
          data.error?.message || data.message || 'Failed to delete position',
          response.status,
          data.error?.code || 'DELETE_FAILED',
          data.error?.details
        );
      }

      // Success - no response body expected
      return;
    },

    onSuccess: async (_, variables) => {
      console.log(`[DELETE] Position ${variables.positionId} - API delete successful, starting cache invalidation...`);

      // Wait for cache invalidation and refetch to complete
      const result = await queryClient.invalidateQueries({
        queryKey: queryKeys.positions.lists(),
      });

      console.log(`[DELETE] Position ${variables.positionId} - Cache invalidation complete. Invalidated queries:`, result);
      console.log(`[DELETE] Position ${variables.positionId} - Checking query cache state...`);

      // Log current cache state
      const queries = queryClient.getQueryCache().findAll({
        queryKey: queryKeys.positions.lists(),
      });

      queries.forEach((query, index) => {
        console.log(`[DELETE] Query ${index + 1}:`, {
          queryKey: query.queryKey,
          state: query.state.status,
          dataUpdatedAt: query.state.dataUpdatedAt,
          isFetching: query.state.fetchStatus === 'fetching',
        });
      });

      console.log(`[DELETE] Position ${variables.positionId} - onSuccess callback complete, modal will close now`);
    },

    onError: (error, variables) => {
      // Log deletion error for debugging
      console.error(
        `Failed to delete position ${variables.positionId}:`,
        error
      );
    },

    ...options,
  });
}

/**
 * Hook to get loading state for a specific position deletion
 *
 * Useful for showing loading states on specific position cards.
 *
 * @param positionId - Position ID to check
 * @returns true if position is currently being deleted
 */
export function useIsDeletingPosition(positionId: string): boolean {
  const queryClient = useQueryClient();
  const mutationCache = queryClient.getMutationCache();

  // Check if there's an active delete mutation for this position
  const deleteMutations = mutationCache.findAll({
    mutationKey: ['positions', 'delete'],
    status: 'pending',
  });

  return deleteMutations.some((mutation) => {
    const variables = mutation.state.variables as
      | DeletePositionParams
      | undefined;
    return variables?.positionId === positionId;
  });
}
