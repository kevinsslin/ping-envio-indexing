/**
 * Uniswap V3 Factory Handler
 * Handles PoolCreated events to dynamically track all PING token pools
 */

import {
  UniswapV3Factory,
  Pool,
} from "generated";
import {
  PING_TOKEN_ADDRESS,
  ZERO_BI,
  ZERO_BD,
} from "../utils/constants";
import { fetchTokenMetadata } from "../utils/token-metadata";

/**
 * Register new PING pools for dynamic event tracking
 * This must come BEFORE the handler to enable Envio's Factory Pattern
 */
UniswapV3Factory.PoolCreated.contractRegister(({ event, context }) => {
  const { token0, token1, pool } = event.params;

  // Only register pools that contain PING token
  const isPingPool =
    token0.toLowerCase() === PING_TOKEN_ADDRESS.toLowerCase() ||
    token1.toLowerCase() === PING_TOKEN_ADDRESS.toLowerCase();

  if (isPingPool) {
    context.addUniswapV3Pool(pool);
    context.log.info(
      `Registered PING pool for dynamic tracking: ${pool} (${token0}/${token1})`
    );
  }
});

/**
 * Handles PoolCreated events from Uniswap V3 Factory
 * Only tracks pools that include the PING token
 */
UniswapV3Factory.PoolCreated.handler(async ({ event, context }) => {
  const { token0, token1, fee, tickSpacing, pool } = event.params;
  const chainId = BigInt(event.chainId);

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

  // Fetch token metadata for both tokens
  context.log.info(`Fetching metadata for token0: ${token0} and token1: ${token1}`);
  const [token0Metadata, token1Metadata] = await Promise.all([
    fetchTokenMetadata(token0),
    fetchTokenMetadata(token1),
  ]);

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

    // Token0 metadata
    token0Symbol: token0Metadata.symbol,
    token0Name: token0Metadata.name,
    token0Decimals: token0Metadata.decimals,

    // Token1 metadata
    token1Symbol: token1Metadata.symbol,
    token1Name: token1Metadata.name,
    token1Decimals: token1Metadata.decimals,

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
    createdAt: BigInt(event.block.timestamp),
    createdAtBlock: BigInt(event.block.number),
    lastSwapAt: ZERO_BI,
  };

  context.Pool.set(poolEntity);

  context.log.info(
    `Pool entity created for ${pool} at block ${event.block.number}`
  );

  // Note: The pool will automatically start being indexed for Swap events
  // once it's created, as long as it's registered in the wildcard contract config
});
