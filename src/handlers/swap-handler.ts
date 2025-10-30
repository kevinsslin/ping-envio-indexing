/**
 * Swap event handler for Uniswap V3 Pools
 * Tracks swap events, pool statistics, and daily activity for all PING pools
 */
import { UniswapV3Pool, Pool, Swap, DailyPoolActivity } from "generated";
import {
  ZERO_BD,
  ONE_BI,
  ONE_BD,
  ZERO_BI,
} from "../utils/constants";
import {
  convertTokenToDecimal,
  getDayId,
  getDayStartTimestamp,
  normalizeAddress,
} from "../utils/index";

UniswapV3Pool.Swap.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);

  // Get the pool address from the event source
  const poolAddress = normalizeAddress(event.srcAddress);
  const poolId = `${chainId}_${poolAddress}`;
  const dayId = getDayId(BigInt(event.block.timestamp));

  // Load entities in parallel
  const [pool, dailyActivity] = await Promise.all([
    context.Pool.get(poolId),
    context.DailyPoolActivity.get(`${poolId}_${dayId}`),
  ]);

  // Skip actual processing during preload phase
  if (context.isPreload) {
    return;
  }

  // If pool doesn't exist, it wasn't created by PoolCreated handler
  // This should only happen for the hardcoded pool before factory was added
  if (!pool) {
    context.log.warn(
      `Pool ${poolAddress} not found in database. Skipping swap event.`
    );
    return;
  }

  // Get token decimals from pool metadata
  const token0Decimals = pool.token0Decimals;
  const token1Decimals = pool.token1Decimals;

  // Convert amounts to decimal
  // In Uniswap V3, negative amount means tokens going into the pool
  // Positive amount means tokens coming out of the pool
  const amount0Raw = event.params.amount0;
  const amount1Raw = event.params.amount1;

  // Convert to BigDecimal, preserving sign
  const amount0 = convertTokenToDecimal(
    amount0Raw < 0 ? -amount0Raw : amount0Raw,
    token0Decimals
  );
  const amount1 = convertTokenToDecimal(
    amount1Raw < 0 ? -amount1Raw : amount1Raw,
    token1Decimals
  );

  // Apply sign back
  const amount0Signed = amount0Raw < 0 ? amount0.times(ZERO_BD.minus(ONE_BD)) : amount0;
  const amount1Signed = amount1Raw < 0 ? amount1.times(ZERO_BD.minus(ONE_BD)) : amount1;

  // For volume calculation, we use absolute values
  const amount0Abs = amount0;
  const amount1Abs = amount1;

  const currentLiquidity = event.params.liquidity;
  const isActive = currentLiquidity > ZERO_BI;

  // Update Pool entity
  const poolEntity: Pool = {
    ...pool,
    liquidity: currentLiquidity,
    sqrtPriceX96: event.params.sqrtPriceX96,
    tick: event.params.tick,
    isActive,
    volumeToken0: pool.volumeToken0.plus(amount0Abs),
    volumeToken1: pool.volumeToken1.plus(amount1Abs),
    txCount: pool.txCount + ONE_BI,
    lastSwapAt: BigInt(event.block.timestamp),
    // Note: totalValueLocked calculations would require price data
    // For now, we're not updating TVL in the swap handler
  };

  // Create Swap record
  const swapEntity: Swap = {
    id: `${chainId}_${event.block.number}_${event.logIndex}`,
    chainId,
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    logIndex: BigInt(event.logIndex),
    pool_id: poolId,
    sender: normalizeAddress(event.params.sender),
    recipient: normalizeAddress(event.params.recipient),
    amount0: amount0Signed,
    amount1: amount1Signed,
    sqrtPriceX96: event.params.sqrtPriceX96,
    liquidity: currentLiquidity,
    tick: event.params.tick,
  };

  // Update or create DailyPoolActivity
  const dayStartTimestamp = getDayStartTimestamp(BigInt(event.block.timestamp));

  const updatedDailyActivity: DailyPoolActivity = dailyActivity
    ? {
        ...dailyActivity,
        dailySwaps: dailyActivity.dailySwaps + ONE_BI,
        dailyVolumeToken0: dailyActivity.dailyVolumeToken0.plus(amount0Abs),
        dailyVolumeToken1: dailyActivity.dailyVolumeToken1.plus(amount1Abs),
        liquidityEnd: currentLiquidity,
        sqrtPriceX96End: event.params.sqrtPriceX96,
      }
    : {
        id: `${poolId}_${dayId}`,
        chainId,
        pool: poolAddress,
        date: dayId,
        timestamp: dayStartTimestamp,
        dailySwaps: ONE_BI,
        dailyVolumeToken0: amount0Abs,
        dailyVolumeToken1: amount1Abs,
        liquidityStart: currentLiquidity,
        liquidityEnd: currentLiquidity,
        sqrtPriceX96Start: event.params.sqrtPriceX96,
        sqrtPriceX96End: event.params.sqrtPriceX96,
      };

  // Save all entities
  context.Pool.set(poolEntity);
  context.Swap.set(swapEntity);
  context.DailyPoolActivity.set(updatedDailyActivity);

  context.log.info(
    `Processed swap for pool ${poolAddress}: ${amount0Abs} token0 / ${amount1Abs} token1`
  );
});
