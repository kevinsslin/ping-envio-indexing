/**
 * Uniswap V3 Factory Handler
 * Handles PoolCreated events to dynamically track all PING token pools
 */

import {
  UniswapV3Factory_PoolCreated_eventArgs,
  UniswapV3Factory_PoolCreated_handlerContext,
  Pool,
} from "generated";
import {
  PING_TOKEN_ADDRESS,
  ZERO_BI,
  ZERO_BD,
} from "../utils/constants";

/**
 * Handles PoolCreated events from Uniswap V3 Factory
 * Only tracks pools that include the PING token
 */
export async function handlePoolCreated(
  event: UniswapV3Factory_PoolCreated_eventArgs,
  context: UniswapV3Factory_PoolCreated_handlerContext
): Promise<void> {
  const { token0, token1, fee, tickSpacing, pool } = event;
  const chainId = BigInt(context.chainId);

  // Check if this pool contains PING token
  const isPingPool =
    token0.toLowerCase() === PING_TOKEN_ADDRESS.toLowerCase() ||
    token1.toLowerCase() === PING_TOKEN_ADDRESS.toLowerCase();

  if (!isPingPool) {
    context.log.info(
      `Skipping non-PING pool: ${pool} (${token0}/${token1})`
    );
    return;
  }

  context.log.info(
    `New PING pool created: ${pool} (${token0}/${token1}, fee: ${fee})`
  );

  // Create Pool entity
  const poolId = `${chainId}_${pool.toLowerCase()}`;
  const poolEntity: Pool = {
    id: poolId,
    chainId,
    address: pool.toLowerCase(),

    // Pool info
    token0: token0.toLowerCase(),
    token1: token1.toLowerCase(),
    feeTier: BigInt(fee),
    tickSpacing: BigInt(tickSpacing),

    // Initial state (will be updated by Initialize event)
    liquidity: ZERO_BI,
    sqrtPriceX96: ZERO_BI,
    tick: ZERO_BI,

    // Status
    isActive: false, // Will be set to true when liquidity > 0

    // Volume stats
    volumeToken0: ZERO_BD,
    volumeToken1: ZERO_BD,
    txCount: ZERO_BI,

    // TVL
    totalValueLockedToken0: ZERO_BD,
    totalValueLockedToken1: ZERO_BD,

    // Timestamps
    createdAt: BigInt(context.timestamp),
    createdAtBlock: BigInt(context.blockNumber),
    lastSwapAt: ZERO_BI,
  };

  context.Pool.set(poolEntity);

  context.log.info(
    `Pool entity created for ${pool} at block ${context.blockNumber}`
  );

  // Note: The pool will automatically start being indexed for Swap events
  // once it's created, as long as it's registered in the wildcard contract config
}
