/**
 * Specific Uniswap V3 Position Endpoint
 *
 * GET /api/v1/positions/uniswapv3/:chainId/:nftId
 * PUT /api/v1/positions/uniswapv3/:chainId/:nftId
 * PATCH /api/v1/positions/uniswapv3/:chainId/:nftId
 * DELETE /api/v1/positions/uniswapv3/:chainId/:nftId
 *
 * Authentication: Required (session or API key)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/with-auth';
import { UniswapV3PositionService } from '@midcurve/services';
import {
  createSuccessResponse,
  createErrorResponse,
  ApiErrorCode,
  ErrorCodeToHttpStatus,
} from '@midcurve/api-shared';
import {
  GetUniswapV3PositionParamsSchema,
  DeleteUniswapV3PositionParamsSchema,
  CreateUniswapV3PositionParamsSchema,
  CreateUniswapV3PositionRequestSchema,
  UpdateUniswapV3PositionParamsSchema,
  UpdateUniswapV3PositionRequestSchema,
} from '@midcurve/api-shared';
import { serializeBigInt } from '@/lib/serializers';
import { apiLogger, apiLog } from '@/lib/logger';
import type {
  GetUniswapV3PositionResponse,
  DeleteUniswapV3PositionResponse,
  CreateUniswapV3PositionData,
  UpdateUniswapV3PositionData,
} from '@midcurve/api-shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const uniswapV3PositionService = new UniswapV3PositionService();

/**
 * GET /api/v1/positions/uniswapv3/:chainId/:nftId
 *
 * Fetch a specific Uniswap V3 position owned by the authenticated user
 * and refresh its state from on-chain data.
 *
 * Features:
 * - Looks up position by user ID + chain ID + NFT ID
 * - Refreshes position state from blockchain (current liquidity, fees, PnL)
 * - Returns complete position data with nested pool and token details
 * - Ensures users can only access their own positions
 *
 * Path parameters:
 * - chainId: EVM chain ID (e.g., 1 = Ethereum, 42161 = Arbitrum, etc.)
 * - nftId: Uniswap V3 NFT token ID
 *
 * Returns: Full position object with current on-chain state
 *
 * Example response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "protocol": "uniswapv3",
 *     "currentValue": "1500000000",  // bigint as string
 *     "unrealizedPnl": "50000000",
 *     "pool": {
 *       "id": "uuid",
 *       "token0": { "symbol": "USDC", ... },
 *       "token1": { "symbol": "WETH", ... },
 *       ...
 *     },
 *     "config": { "chainId": 1, "nftId": "123456", ... },
 *     "state": { "liquidity": "...", "tokensOwed0": "...", ... },
 *     ...
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chainId: string; nftId: string }> }
): Promise<Response> {
  return withAuth(request, async (user, requestId) => {
    const startTime = Date.now();

    try {
      // 1. Parse and validate path parameters
      const resolvedParams = await params;
      const validation = GetUniswapV3PositionParamsSchema.safeParse(resolvedParams);

      if (!validation.success) {
        apiLog.validationError(apiLogger, requestId, validation.error.errors);

        const errorResponse = createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Invalid path parameters',
          validation.error.errors
        );

        apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);

        return NextResponse.json(errorResponse, {
          status: ErrorCodeToHttpStatus[ApiErrorCode.VALIDATION_ERROR],
        });
      }

      const { chainId, nftId } = validation.data;

      // 2. Generate position hash and look up position
      // Format: "uniswapv3/{chainId}/{nftId}"
      const positionHash = `uniswapv3/${chainId}/${nftId}`;

      apiLog.businessOperation(apiLogger, requestId, 'lookup', 'position', positionHash, {
        chainId,
        nftId,
        userId: user.id,
      });

      // Fast indexed lookup by positionHash
      const dbPosition = await uniswapV3PositionService.findByPositionHash(user.id, positionHash);

      // Verify position exists
      if (!dbPosition) {
        const errorResponse = createErrorResponse(
          ApiErrorCode.POSITION_NOT_FOUND,
          'Position not found',
          `No Uniswap V3 position found for chainId ${chainId} and nftId ${nftId}`
        );

        apiLog.requestEnd(apiLogger, requestId, 404, Date.now() - startTime);

        return NextResponse.json(errorResponse, {
          status: ErrorCodeToHttpStatus[ApiErrorCode.POSITION_NOT_FOUND],
        });
      }

      apiLog.businessOperation(apiLogger, requestId, 'fetch', 'position', dbPosition.id, {
        chainId,
        nftId,
        positionHash,
      });

      // 3. Refresh position from on-chain data
      // This fetches current liquidity, fees, PnL, and updates the database
      const position = await uniswapV3PositionService.refresh(dbPosition.id);

      apiLog.businessOperation(apiLogger, requestId, 'refreshed', 'position', position.id, {
        chainId,
        nftId,
        pool: `${position.pool.token0.symbol}/${position.pool.token1.symbol}`,
        currentValue: position.currentValue.toString(),
        unrealizedPnl: position.unrealizedPnl.toString(),
      });

      // 4. Serialize bigints to strings for JSON
      const serializedPosition = serializeBigInt(position) as GetUniswapV3PositionResponse;

      const response = createSuccessResponse(serializedPosition);

      apiLog.requestEnd(apiLogger, requestId, 200, Date.now() - startTime);

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      apiLog.methodError(
        apiLogger,
        'GET /api/v1/positions/uniswapv3/:chainId/:nftId',
        error,
        { requestId }
      );

      // Map service errors to API error codes
      if (error instanceof Error) {
        // Chain not supported
        if (
          error.message.includes('not configured') ||
          error.message.includes('not supported')
        ) {
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

        // Position not found
        if (
          error.message.includes('not found') ||
          error.message.includes('does not exist')
        ) {
          const errorResponse = createErrorResponse(
            ApiErrorCode.POSITION_NOT_FOUND,
            'Position not found',
            error.message
          );
          apiLog.requestEnd(apiLogger, requestId, 404, Date.now() - startTime);
          return NextResponse.json(errorResponse, {
            status: ErrorCodeToHttpStatus[ApiErrorCode.POSITION_NOT_FOUND],
          });
        }

        // On-chain read failures (RPC errors, contract errors)
        if (
          error.message.includes('Failed to read') ||
          error.message.includes('contract') ||
          error.message.includes('RPC')
        ) {
          const errorResponse = createErrorResponse(
            ApiErrorCode.BAD_REQUEST,
            'Failed to refresh position data from blockchain',
            error.message
          );
          apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);
          return NextResponse.json(errorResponse, {
            status: ErrorCodeToHttpStatus[ApiErrorCode.BAD_REQUEST],
          });
        }
      }

      // Generic error
      const errorResponse = createErrorResponse(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to fetch position',
        error instanceof Error ? error.message : String(error)
      );
      apiLog.requestEnd(apiLogger, requestId, 500, Date.now() - startTime);
      return NextResponse.json(errorResponse, {
        status: ErrorCodeToHttpStatus[ApiErrorCode.INTERNAL_SERVER_ERROR],
      });
    }
  });
}

/**
 * DELETE /api/v1/positions/uniswapv3/:chainId/:nftId
 *
 * Delete a specific Uniswap V3 position owned by the authenticated user.
 *
 * Features:
 * - Idempotent: Returns success even if position doesn't exist
 * - Uses positionHash for fast indexed lookup
 * - Verifies user ownership before deletion
 * - Only deletes positions belonging to the authenticated user
 *
 * Path parameters:
 * - chainId: EVM chain ID (e.g., 1 = Ethereum, 42161 = Arbitrum, etc.)
 * - nftId: Uniswap V3 NFT token ID (positive integer)
 *
 * Returns: Empty success response
 *
 * Example response:
 * {
 *   "success": true,
 *   "data": {},
 *   "meta": { "requestId": "...", "timestamp": "..." }
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chainId: string; nftId: string }> }
): Promise<Response> {
  return withAuth(request, async (user, requestId) => {
    const startTime = Date.now();

    try {
      // 1. Parse and validate path parameters
      const resolvedParams = await params;
      const validation = DeleteUniswapV3PositionParamsSchema.safeParse(resolvedParams);

      if (!validation.success) {
        apiLog.validationError(apiLogger, requestId, validation.error.errors);

        const errorResponse = createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Invalid path parameters',
          validation.error.errors
        );

        apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);

        return NextResponse.json(errorResponse, {
          status: ErrorCodeToHttpStatus[ApiErrorCode.VALIDATION_ERROR],
        });
      }

      const { chainId, nftId } = validation.data;

      // 2. Generate position hash and look up position
      // Format: "uniswapv3/{chainId}/{nftId}"
      const positionHash = `uniswapv3/${chainId}/${nftId}`;

      apiLog.businessOperation(apiLogger, requestId, 'lookup', 'position', positionHash, {
        chainId,
        nftId,
        userId: user.id,
      });

      // Fast indexed lookup by positionHash
      const dbPosition = await uniswapV3PositionService.findByPositionHash(user.id, positionHash);

      // Idempotent: If position doesn't exist, consider it already deleted
      if (!dbPosition) {
        apiLog.businessOperation(
          apiLogger,
          requestId,
          'delete-idempotent',
          'position',
          positionHash,
          {
            chainId,
            nftId,
            userId: user.id,
            reason: 'Position not found (already deleted or never existed)',
          }
        );

        const response = createSuccessResponse<DeleteUniswapV3PositionResponse>({});

        apiLog.requestEnd(apiLogger, requestId, 200, Date.now() - startTime);

        return NextResponse.json(response, { status: 200 });
      }

      apiLog.businessOperation(apiLogger, requestId, 'delete', 'position', dbPosition.id, {
        chainId,
        nftId,
        positionHash,
      });

      // 3. Delete the position
      // Service handles protocol verification and deletion
      await uniswapV3PositionService.delete(dbPosition.id);

      apiLog.businessOperation(apiLogger, requestId, 'deleted', 'position', dbPosition.id, {
        chainId,
        nftId,
        positionHash,
      });

      const response = createSuccessResponse<DeleteUniswapV3PositionResponse>({});

      apiLog.requestEnd(apiLogger, requestId, 200, Date.now() - startTime);

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      apiLog.methodError(
        apiLogger,
        'DELETE /api/v1/positions/uniswapv3/:chainId/:nftId',
        error,
        { requestId }
      );

      // Map service errors to API error codes
      if (error instanceof Error) {
        // Protocol mismatch (shouldn't happen with positionHash lookup, but defensive)
        if (error.message.includes('expected protocol')) {
          const errorResponse = createErrorResponse(
            ApiErrorCode.INTERNAL_SERVER_ERROR,
            'Position protocol mismatch',
            error.message
          );
          apiLog.requestEnd(apiLogger, requestId, 500, Date.now() - startTime);
          return NextResponse.json(errorResponse, {
            status: ErrorCodeToHttpStatus[ApiErrorCode.INTERNAL_SERVER_ERROR],
          });
        }
      }

      // Generic error
      const errorResponse = createErrorResponse(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to delete position',
        error instanceof Error ? error.message : String(error)
      );
      apiLog.requestEnd(apiLogger, requestId, 500, Date.now() - startTime);
      return NextResponse.json(errorResponse, {
        status: ErrorCodeToHttpStatus[ApiErrorCode.INTERNAL_SERVER_ERROR],
      });
    }
  });
}

/**
 * PUT /api/v1/positions/uniswapv3/:chainId/:nftId
 *
 * Create a Uniswap V3 position from user-provided data after sending an
 * INCREASE_LIQUIDITY transaction on-chain.
 *
 * Features:
 * - Idempotent: Returns existing position if already created
 * - Minimal on-chain calls (pool discovery + historic pool price)
 * - Full PnL tracking via ledger events
 * - Auto quote token detection or explicit selection
 * - Historic pool price at event blockNumber
 *
 * Path parameters:
 * - chainId: EVM chain ID (e.g., 1 = Ethereum, 42161 = Arbitrum, etc.)
 * - nftId: Uniswap V3 NFT token ID (positive integer)
 *
 * Request body:
 * {
 *   "poolAddress": "0x...",
 *   "tickUpper": 201120,
 *   "tickLower": 199120,
 *   "ownerAddress": "0x...",
 *   "quoteTokenAddress": "0x..." (optional),
 *   "increaseEvent": {
 *     "timestamp": "2025-01-15T10:30:00Z",
 *     "blockNumber": "12345678",
 *     "transactionIndex": 42,
 *     "logIndex": 5,
 *     "transactionHash": "0x...",
 *     "liquidity": "1000000000000000000",
 *     "amount0": "500000000",
 *     "amount1": "250000000000000000"
 *   }
 * }
 *
 * Returns: Full position object with current on-chain state and financial tracking
 *
 * Example response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "protocol": "uniswapv3",
 *     "currentValue": "1500000000",
 *     "currentCostBasis": "1500000000",
 *     "unrealizedPnl": "0",
 *     "pool": { ... },
 *     "config": { ... },
 *     "state": { ... },
 *     ...
 *   }
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ chainId: string; nftId: string }> }
): Promise<Response> {
  return withAuth(request, async (user, requestId) => {
    const startTime = Date.now();

    try {
      // 1. Parse and validate path parameters
      const resolvedParams = await params;
      const paramsValidation = CreateUniswapV3PositionParamsSchema.safeParse(resolvedParams);

      if (!paramsValidation.success) {
        apiLog.validationError(apiLogger, requestId, paramsValidation.error.errors);

        const errorResponse = createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Invalid path parameters',
          paramsValidation.error.errors
        );

        apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);

        return NextResponse.json(errorResponse, {
          status: ErrorCodeToHttpStatus[ApiErrorCode.VALIDATION_ERROR],
        });
      }

      const { chainId, nftId } = paramsValidation.data;

      // 2. Parse and validate request body
      const body = await request.json();
      const bodyValidation = CreateUniswapV3PositionRequestSchema.safeParse(body);

      if (!bodyValidation.success) {
        apiLog.validationError(apiLogger, requestId, bodyValidation.error.errors);

        const errorResponse = createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          bodyValidation.error.errors
        );

        apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);

        return NextResponse.json(errorResponse, {
          status: ErrorCodeToHttpStatus[ApiErrorCode.VALIDATION_ERROR],
        });
      }

      const {
        poolAddress,
        tickUpper,
        tickLower,
        ownerAddress,
        quoteTokenAddress,
        increaseEvent,
      } = bodyValidation.data;

      apiLog.businessOperation(apiLogger, requestId, 'create', 'position', `${chainId}/${nftId}`, {
        chainId,
        nftId,
        poolAddress,
        userId: user.id,
      });

      // 3. Convert string bigints to BigInt
      const increaseEventBigInt = {
        timestamp: new Date(increaseEvent.timestamp),
        blockNumber: BigInt(increaseEvent.blockNumber),
        transactionIndex: increaseEvent.transactionIndex,
        logIndex: increaseEvent.logIndex,
        transactionHash: increaseEvent.transactionHash,
        liquidity: BigInt(increaseEvent.liquidity),
        amount0: BigInt(increaseEvent.amount0),
        amount1: BigInt(increaseEvent.amount1),
      };

      // 4. Create position from user data
      const position = await uniswapV3PositionService.createPositionFromUserData(
        user.id,
        chainId,
        nftId,
        {
          poolAddress,
          tickUpper,
          tickLower,
          ownerAddress,
          quoteTokenAddress,
          increaseEvent: increaseEventBigInt,
        }
      );

      apiLog.businessOperation(apiLogger, requestId, 'created', 'position', position.id, {
        chainId,
        nftId,
        pool: `${position.pool.token0.symbol}/${position.pool.token1.symbol}`,
        quoteToken: position.isToken0Quote
          ? position.pool.token0.symbol
          : position.pool.token1.symbol,
        currentValue: position.currentValue.toString(),
      });

      // 5. Serialize bigints to strings for JSON
      const serializedPosition = serializeBigInt(position) as CreateUniswapV3PositionData;

      const response = createSuccessResponse(serializedPosition);

      apiLog.requestEnd(apiLogger, requestId, 200, Date.now() - startTime);

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      apiLog.methodError(
        apiLogger,
        'PUT /api/v1/positions/uniswapv3/:chainId/:nftId',
        error,
        { requestId }
      );

      // Map service errors to API error codes
      if (error instanceof Error) {
        // Invalid address format
        if (error.message.includes('Invalid') && error.message.includes('address')) {
          const errorResponse = createErrorResponse(
            ApiErrorCode.INVALID_ADDRESS,
            'Invalid address format',
            error.message
          );
          apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);
          return NextResponse.json(errorResponse, {
            status: ErrorCodeToHttpStatus[ApiErrorCode.INVALID_ADDRESS],
          });
        }

        // Chain not supported
        if (
          error.message.includes('not configured') ||
          error.message.includes('not supported')
        ) {
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

        // Pool not found
        if (
          error.message.includes('Pool not found') ||
          error.message.includes('pool')
        ) {
          const errorResponse = createErrorResponse(
            ApiErrorCode.POOL_NOT_FOUND,
            'Pool not found',
            error.message
          );
          apiLog.requestEnd(apiLogger, requestId, 404, Date.now() - startTime);
          return NextResponse.json(errorResponse, {
            status: ErrorCodeToHttpStatus[ApiErrorCode.POOL_NOT_FOUND],
          });
        }

        // Quote token mismatch
        if (error.message.includes('Quote token')) {
          const errorResponse = createErrorResponse(
            ApiErrorCode.BAD_REQUEST,
            'Quote token does not match pool tokens',
            error.message
          );
          apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);
          return NextResponse.json(errorResponse, {
            status: ErrorCodeToHttpStatus[ApiErrorCode.BAD_REQUEST],
          });
        }

        // On-chain read failures (RPC errors, contract errors)
        if (
          error.message.includes('Failed to read') ||
          error.message.includes('contract') ||
          error.message.includes('RPC')
        ) {
          const errorResponse = createErrorResponse(
            ApiErrorCode.BAD_REQUEST,
            'Failed to fetch data from blockchain',
            error.message
          );
          apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);
          return NextResponse.json(errorResponse, {
            status: ErrorCodeToHttpStatus[ApiErrorCode.BAD_REQUEST],
          });
        }
      }

      // Generic error
      const errorResponse = createErrorResponse(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to create position',
        error instanceof Error ? error.message : String(error)
      );
      apiLog.requestEnd(apiLogger, requestId, 500, Date.now() - startTime);
      return NextResponse.json(errorResponse, {
        status: ErrorCodeToHttpStatus[ApiErrorCode.INTERNAL_SERVER_ERROR],
      });
    }
  });
}

/**
 * PATCH /api/v1/positions/uniswapv3/:chainId/:nftId
 *
 * Update an existing Uniswap V3 position by adding new events from user data.
 *
 * Features:
 * - Validates ownership (returns 404 if position not found or not owned by user)
 * - Adds events to position ledger (events must come AFTER existing events)
 * - Refreshes position state with new financial calculations
 * - Returns fully populated position with updated PnL, fees, etc.
 *
 * Security:
 * - Returns 404 for both "not found" and "not owned" to prevent information leakage
 * - Validates event ordering (blockNumber → txIndex → logIndex)
 * - Ensures all events come after existing events
 *
 * Use case:
 * - User creates a transaction on-chain (INCREASE_LIQUIDITY, DECREASE_LIQUIDITY, COLLECT)
 * - Frontend gets transaction receipt
 * - Frontend calls this endpoint with event data to update position in database
 *
 * Path parameters:
 * - chainId: Chain ID (1 = Ethereum, 42161 = Arbitrum, etc.)
 * - nftId: NFT token ID
 *
 * Request body:
 * - events: Array of events to add (INCREASE_LIQUIDITY, DECREASE_LIQUIDITY, COLLECT)
 *
 * Response:
 * - 200: Position updated successfully
 * - 404: Position not found or not owned by user
 * - 400: Validation error (invalid events, ordering, etc.)
 * - 500: Server error
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ chainId: string; nftId: string }> }
) {
  return withAuth(req, async (user, requestId) => {
    const startTime = Date.now();
    apiLog.requestStart(apiLogger, requestId, req);

    try {
      // 1. Parse and validate path parameters
      const resolvedParams = await params;
      const paramsResult = UpdateUniswapV3PositionParamsSchema.safeParse(
        resolvedParams
      );

      if (!paramsResult.success) {
        const errorResponse = createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Invalid path parameters',
          paramsResult.error.errors
        );
        apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);
        return NextResponse.json(errorResponse, {
          status: ErrorCodeToHttpStatus[ApiErrorCode.VALIDATION_ERROR],
        });
      }

      const { chainId, nftId } = paramsResult.data;

      apiLogger.debug(
        { requestId, userId: user.id, chainId, nftId },
        'Path parameters validated'
      );

      // 2. Parse and validate request body
      const body = await req.json();
      const bodyResult = UpdateUniswapV3PositionRequestSchema.safeParse(body);

      if (!bodyResult.success) {
        const errorResponse = createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          bodyResult.error.errors
        );
        apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);
        return NextResponse.json(errorResponse, {
          status: ErrorCodeToHttpStatus[ApiErrorCode.VALIDATION_ERROR],
        });
      }

      const { events } = bodyResult.data;

      apiLogger.debug(
        { requestId, userId: user.id, chainId, nftId, eventCount: events.length },
        'Request body validated'
      );

      // 3. Convert event data from API types to service types
      const serviceEvents = events.map((event) => ({
        eventType: event.eventType,
        timestamp: new Date(event.timestamp),
        blockNumber: BigInt(event.blockNumber),
        transactionIndex: event.transactionIndex,
        logIndex: event.logIndex,
        transactionHash: event.transactionHash,
        tokenId: BigInt(nftId),
        liquidity: event.liquidity ? BigInt(event.liquidity) : undefined,
        amount0: BigInt(event.amount0),
        amount1: BigInt(event.amount1),
        recipient: event.recipient,
      }));

      apiLogger.info(
        { requestId, userId: user.id, chainId, nftId, eventCount: events.length },
        'Adding events to position'
      );

      // 4. Call service to update position
      const updatedPosition =
        await uniswapV3PositionService.updatePositionWithEvents(
          user.id,
          chainId,
          nftId,
          serviceEvents
        );

      // 5. Return 404 if position not found or not owned
      if (!updatedPosition) {
        const errorResponse = createErrorResponse(
          ApiErrorCode.NOT_FOUND,
          'Position not found'
        );
        apiLog.requestEnd(apiLogger, requestId, 404, Date.now() - startTime);
        return NextResponse.json(errorResponse, {
          status: ErrorCodeToHttpStatus[ApiErrorCode.NOT_FOUND],
        });
      }

      apiLogger.info(
        {
          requestId,
          userId: user.id,
          chainId,
          nftId,
          positionId: updatedPosition.id,
          eventsAdded: events.length,
        },
        'Position updated successfully'
      );

      // 6. Serialize and return response
      const serializedPosition = serializeBigInt(
        updatedPosition
      ) as UpdateUniswapV3PositionData;

      const response = createSuccessResponse(serializedPosition);

      apiLog.requestEnd(apiLogger, requestId, 200, Date.now() - startTime);
      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      apiLogger.error(
        { requestId, error, userId: user.id },
        'Error updating position with events'
      );

      // Event ordering error
      if (
        error instanceof Error &&
        (error.message.includes('comes before last existing event') ||
          error.message.includes('comes before previous event in batch'))
      ) {
        const errorResponse = createErrorResponse(
          ApiErrorCode.BAD_REQUEST,
          'Invalid event ordering',
          error.message
        );
        apiLog.requestEnd(apiLogger, requestId, 400, Date.now() - startTime);
        return NextResponse.json(errorResponse, {
          status: ErrorCodeToHttpStatus[ApiErrorCode.BAD_REQUEST],
        });
      }

      // Generic error
      const errorResponse = createErrorResponse(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to update position',
        error instanceof Error ? error.message : String(error)
      );
      apiLog.requestEnd(apiLogger, requestId, 500, Date.now() - startTime);
      return NextResponse.json(errorResponse, {
        status: ErrorCodeToHttpStatus[ApiErrorCode.INTERNAL_SERVER_ERROR],
      });
    }
  });
}
