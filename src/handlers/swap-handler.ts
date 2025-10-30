/**
 * Swap event handler for Uniswap V3 Pools
 * Tracks swap events, pool statistics, daily activity, and account buy/sell activity for all PING pools
 */
import { UniswapV3Pool, Pool, Swap, DailyPoolActivity, Account } from "generated";
import {
  ZERO_BD,
  ONE_BI,
  ONE_BD,
  ZERO_BI,
  PING_TOKEN_ADDRESS,
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

  // Track Account buy/sell activity based on transaction initiator
  // Normalize PING token address for comparison
  const pingAddress = normalizeAddress(PING_TOKEN_ADDRESS);
  const token0Address = normalizeAddress(pool.token0);
  const token1Address = normalizeAddress(pool.token1);

  // Determine if PING is token0 or token1
  const isPingToken0 = token0Address === pingAddress;
  const isPingToken1 = token1Address === pingAddress;

  // Only track buy/sell if this pool involves PING token
  if (isPingToken0 || isPingToken1) {
    // Skip buy/sell tracking if transaction.from is unavailable
    if (!event.transaction.from) {
      context.log.warn(
        `Swap event missing transaction.from field at block ${event.block.number}. Skipping buy/sell tracking.`
      );
    } else {
      const txInitiator = normalizeAddress(event.transaction.from);
      const recipient = normalizeAddress(event.params.recipient);
      const txHash = event.transaction.hash;
      const timestamp = BigInt(event.block.timestamp);

      // Determine if this is a BUY or SELL based on PING amount direction
      let isBuy = false;
      let isSell = false;
      let pingAmount = ZERO_BD;

      if (isPingToken0) {
        // PING is token0
        // Positive amount0 = PING coming out of pool (BUY)
        // Negative amount0 = PING going into pool (SELL)
        if (amount0Raw > 0) {
          isBuy = true;
          pingAmount = amount0Abs;
        } else if (amount0Raw < 0) {
          isSell = true;
          pingAmount = amount0Abs;
        }
      } else if (isPingToken1) {
        // PING is token1
        // Positive amount1 = PING coming out of pool (BUY)
        // Negative amount1 = PING going into pool (SELL)
        if (amount1Raw > 0) {
          isBuy = true;
          pingAmount = amount1Abs;
        } else if (amount1Raw < 0) {
          isSell = true;
          pingAmount = amount1Abs;
        }
      }

      // Update Account for BUY (recipient receives PING from pool)
      if (isBuy && pingAmount.gt(ZERO_BD)) {
        const accountId = `${chainId}_${recipient}`;
        const account = await context.Account.get(accountId);

        if (account) {
          context.Account.set({
            ...account,
            lastBuyAt: timestamp,
            lastBuyHash: txHash,
            totalBuys: account.totalBuys + ONE_BI,
            totalBuyVolume: account.totalBuyVolume.plus(pingAmount),
          });

          context.log.info(
            `Updated BUY for account ${recipient}: ${pingAmount} PING`
          );
        }
      }

      // Update Account for SELL (transaction initiator sends PING to pool)
      if (isSell && pingAmount.gt(ZERO_BD)) {
        const accountId = `${chainId}_${txInitiator}`;
        const account = await context.Account.get(accountId);

        if (account) {
          context.Account.set({
            ...account,
            lastSellAt: timestamp,
            lastSellHash: txHash,
            totalSells: account.totalSells + ONE_BI,
            totalSellVolume: account.totalSellVolume.plus(pingAmount),
          });

          context.log.info(
            `Updated SELL for account ${txInitiator}: ${pingAmount} PING`
          );
        }
      }
    }
  }

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
