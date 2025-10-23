/**
 * ERC-20 Token Search Endpoint
 *
 * GET /api/v1/tokens/erc20/search - Search tokens
 *
 * Authentication: Required (session or API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/with-auth';
import { Erc20TokenService } from '@midcurve/services';
import {
  createSuccessResponse,
  createErrorResponse,
  ApiErrorCode,
  ErrorCodeToHttpStatus,
} from '@midcurve/api-shared';
import { SearchErc20TokensQuerySchema } from '@midcurve/api-shared';
import { apiLogger, apiLog } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const erc20TokenService = new Erc20TokenService();

/**
 * GET /api/v1/tokens/erc20/search
 *
 * Search for ERC-20 tokens in CoinGecko's catalog by symbol, name, and/or address.
 * Returns up to 10 matching token candidates from CoinGecko (not from database).
 *
 * All search criteria are combined with AND logic - a token must match ALL provided
 * parameters to be included in results.
 *
 * Query params:
 * - chainId (required): EVM chain ID
 * - symbol (optional): Partial symbol match (case-insensitive)
 * - name (optional): Partial name match (case-insensitive)
 * - address (optional): Contract address (exact match, case-insensitive)
 * - At least one of symbol, name, or address must be provided
 *
 * Examples:
 * GET /api/v1/tokens/erc20/search?chainId=1&symbol=usd
 * GET /api/v1/tokens/erc20/search?chainId=1&address=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
 * GET /api/v1/tokens/erc20/search?chainId=1&address=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&symbol=USDC
 *
 * Returns: Array of matching token candidates from CoinGecko (max 10 results)
 *
 * To add a token to the database, use POST /api/v1/tokens/erc20 with
 * the address and chainId from the search result.
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withAuth(request, async (_user, requestId) => {
    const startTime = Date.now();

    try {
      // Parse query params
      const { searchParams } = new URL(request.url);
      const queryParams = {
        chainId: searchParams.get('chainId'),
        symbol: searchParams.get('symbol') || undefined,
        name: searchParams.get('name') || undefined,
        address: searchParams.get('address') || undefined,
      };

      // Validate query params
      const validation = SearchErc20TokensQuerySchema.safeParse(queryParams);

      if (!validation.success) {
        apiLog.validationError(apiLogger, requestId, validation.error.errors);

        const errorResponse = createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Invalid query parameters',
          validation.error.errors
        );

        apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);

        return NextResponse.json(errorResponse, {
          status: ErrorCodeToHttpStatus[ApiErrorCode.VALIDATION_ERROR],
        });
      }

      const { chainId, symbol, name, address } = validation.data;

      // Search tokens via service (searches CoinGecko, not database)
      const candidates = await erc20TokenService.searchTokens({
        chainId,
        symbol,
        name,
        address,
      });

      apiLogger.info({
        requestId,
        operation: 'search',
        resourceType: 'erc20-tokens',
        chainId,
        symbol,
        name,
        address: address?.slice(0, 10) + '...',
        resultsCount: candidates.length,
        msg: `Token search returned ${candidates.length} results`,
      });

      // Candidates are already in the correct API response format
      // (no conversion needed - they come from CoinGecko)
      const response = createSuccessResponse(candidates, {
        count: candidates.length,
        limit: 10,
        timestamp: new Date().toISOString(),
      });

      apiLog.requestEnd(apiLogger, requestId, 200, Date.now() - startTime);

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      apiLog.methodError(apiLogger, 'GET /api/v1/tokens/erc20/search', error, { requestId });

      // Map service errors to API error codes
      if (error instanceof Error) {
        if (error.message.includes('at least one')) {
          const errorResponse = createErrorResponse(
            ApiErrorCode.VALIDATION_ERROR,
            'At least one search parameter (symbol or name) required',
            error.message
          );

          apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);

          return NextResponse.json(errorResponse, {
            status: ErrorCodeToHttpStatus[ApiErrorCode.VALIDATION_ERROR],
          });
        }

        if (error.message.includes('not configured')) {
          const errorResponse = createErrorResponse(
            ApiErrorCode.CHAIN_NOT_SUPPORTED,
            'Chain not supported',
            error.message
          );

          apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);

          return NextResponse.json(errorResponse, {
            status: ErrorCodeToHttpStatus[ApiErrorCode.CHAIN_NOT_SUPPORTED],
          });
        }
      }

      // Generic error
      const errorResponse = createErrorResponse(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to search tokens',
        error instanceof Error ? error.message : String(error)
      );

      apiLog.requestEnd(apiLogger, requestId, 500, Date.now() - startTime);

      return NextResponse.json(errorResponse, {
        status: ErrorCodeToHttpStatus[ApiErrorCode.INTERNAL_SERVER_ERROR],
      });
    }
  });
}
