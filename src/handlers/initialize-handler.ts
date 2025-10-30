/**
 * Initialize event handler for Uniswap V3 Pools
 * Updates pool with initial price and tick when liquidity is first added
 */
import { UniswapV3Pool, Pool } from "generated";
import { normalizeAddress } from "../utils/index";

UniswapV3Pool.Initialize.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  const poolAddress = normalizeAddress(event.srcAddress);
  const poolId = `${chainId}_${poolAddress}`;

  // Load the pool
  const pool = await context.Pool.get(poolId);

  // Skip during preload
  if (context.isPreload) {
    return;
  }

  if (!pool) {
    context.log.warn(
      `Pool ${poolAddress} not found when processing Initialize event. This pool may not contain PING token.`
    );
    return;
  }

  context.log.info(
    `Initializing pool ${poolAddress} with sqrtPriceX96: ${event.params.sqrtPriceX96}, tick: ${event.params.tick}`
  );

  // Update pool with initial state
  const updatedPool: Pool = {
    ...pool,
    sqrtPriceX96: event.params.sqrtPriceX96,
    tick: event.params.tick,
    // Pool becomes active when initialized (will have liquidity soon)
    isActive: true,
  };

  context.Pool.set(updatedPool);
});
