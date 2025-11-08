/**
 * Uniswap V4 Pool Manager Event Handlers
 *
 * Handles events from the singleton PoolManager contract:
 * - Initialize: Pool creation (replaces Factory.PoolCreated in V3)
 * - Swap: Swap events within pools
 */

import {
  UniswapV4PoolManager,
  PoolV4,
  PoolV4Registry,
  SwapV4,
  Account,
} from "generated";
import {
  PING_TOKEN_ADDRESS,
  ZERO_BI,
  ZERO_BD,
  ONE_BI,
} from "./utils/constants";
import { fetchTokenMetadata } from "./utils/token-metadata";
import { abs, convertToDecimal } from "./utils/v4-tick-math";

/**
 * Helper to convert token amount to decimal
 */
function convertTokenToDecimal(amount: bigint, decimals: bigint) {
  return convertToDecimal(amount, decimals);
}

/**
 * Handle Initialize events - V4 pool creation
 * This replaces the Factory.PoolCreated pattern from V3
 */
UniswapV4PoolManager.Initialize.handler(async ({ event, context }) => {
  const { id: poolId, currency0, currency1, fee, tickSpacing, hooks, sqrtPriceX96, tick } = event.params;
  const chainId = BigInt(event.chainId);

  // Check if this pool contains PING token
  const pingAddress = PING_TOKEN_ADDRESS.toLowerCase();
  const isPingPool =
    currency0.toLowerCase() === pingAddress ||
    currency1.toLowerCase() === pingAddress;

  if (!isPingPool) {
    context.log.info(`Skipping non-PING V4 pool: ${poolId}`);
    return;
  }

  context.log.info(
    `New PING V4 pool initialized: ${poolId} (${currency0}/${currency1}, fee: ${fee})`
  );

  // Fetch token metadata
  context.log.info(`Fetching metadata for currency0: ${currency0} and currency1: ${currency1}`);
  const [currency0Metadata, currency1Metadata] = await Promise.all([
    fetchTokenMetadata(currency0),
    fetchTokenMetadata(currency1),
  ]);

  // Create PoolV4Registry entry for quick PING pool lookups
  const registryEntity: PoolV4Registry = {
    id: poolId,
    poolId,
    isPingPool: true,
    currency0: currency0.toLowerCase(),
    currency1: currency1.toLowerCase(),
  };

  // Create PoolV4 entity
  const poolEntity: PoolV4 = {
    id: `${chainId}_${poolId}`,
    chainId,
    poolId,

    // PoolKey components
    currency0: currency0.toLowerCase(),
    currency1: currency1.toLowerCase(),
    fee: BigInt(fee),
    tickSpacing: BigInt(tickSpacing),
    hooks: hooks.toLowerCase(),

    // Currency0 metadata
    currency0Symbol: currency0Metadata.symbol,
    currency0Name: currency0Metadata.name,
    currency0Decimals: currency0Metadata.decimals,

    // Currency1 metadata
    currency1Symbol: currency1Metadata.symbol,
    currency1Name: currency1Metadata.name,
    currency1Decimals: currency1Metadata.decimals,

    // Initial state
    sqrtPriceX96: BigInt(sqrtPriceX96),
    liquidity: ZERO_BI, // Will be updated by ModifyLiquidity events
    tick: BigInt(tick),

    // Status
    isActive: false, // Will be set to true when liquidity > 0

    // Volume stats
    volumeCurrency0: ZERO_BD,
    volumeCurrency1: ZERO_BD,
    txCount: ZERO_BI,

    // TVL
    totalValueLockedCurrency0: ZERO_BD,
    totalValueLockedCurrency1: ZERO_BD,

    // Timestamps
    createdAt: BigInt(event.block.timestamp),
    createdAtBlock: BigInt(event.block.number),
    lastSwapAt: ZERO_BI,
  };

  context.PoolV4Registry.set(registryEntity);
  context.PoolV4.set(poolEntity);

  context.log.info(
    `PoolV4 entity created for ${poolId} at block ${event.block.number}`
  );
});

/**
 * Handle Swap events for V4 pools
 */
UniswapV4PoolManager.Swap.handler(async ({ event, context }) => {
  const { id: poolId, sender, amount0, amount1, sqrtPriceX96, liquidity, tick, swapFee } = event.params;
  const chainId = BigInt(event.chainId);

  // Check if this is a PING pool
  const registry = await context.PoolV4Registry.get(poolId);
  if (!registry || !registry.isPingPool) {
    return; // Skip non-PING pools
  }

  // Load pool
  const poolEntityId = `${chainId}_${poolId}`;
  const pool = await context.PoolV4.get(poolEntityId);
  if (!pool) {
    context.log.warn(`Pool ${poolId} not found when processing Swap`);
    return;
  }

  // Convert amounts to decimal (absolute values for volume tracking)
  const absAmount0 = abs(BigInt(amount0));
  const absAmount1 = abs(BigInt(amount1));
  const amount0Dec = convertTokenToDecimal(absAmount0, pool.currency0Decimals);
  const amount1Dec = convertTokenToDecimal(absAmount1, pool.currency1Decimals);

  // For signed amounts (for swap record)
  const amount0Signed = BigInt(amount0) < BigInt(0)
    ? amount0Dec.times("-1")
    : amount0Dec;
  const amount1Signed = BigInt(amount1) < BigInt(0)
    ? amount1Dec.times("-1")
    : amount1Dec;

  // Update pool statistics
  const updatedPool: PoolV4 = {
    ...pool,
    sqrtPriceX96: BigInt(sqrtPriceX96),
    liquidity: BigInt(liquidity),
    tick: BigInt(tick),
    volumeCurrency0: pool.volumeCurrency0.plus(amount0Dec),
    volumeCurrency1: pool.volumeCurrency1.plus(amount1Dec),
    txCount: pool.txCount + ONE_BI,
    lastSwapAt: BigInt(event.block.timestamp),
    isActive: BigInt(liquidity) > ZERO_BI,
  };

  // Create SwapV4 record
  const swapId = `${chainId}_${event.block.number}_${event.logIndex}`;
  const swapEntity: SwapV4 = {
    id: swapId,
    chainId,
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    logIndex: BigInt(event.logIndex),
    pool_id: poolEntityId,
    poolId,
    sender: sender.toLowerCase(),
    amount0: amount0Signed,
    amount1: amount1Signed,
    sqrtPriceX96: BigInt(sqrtPriceX96),
    liquidity: BigInt(liquidity),
    tick: BigInt(tick),
    swapFee: BigInt(swapFee),
  };

  context.PoolV4.set(updatedPool);
  context.SwapV4.set(swapEntity);

  context.log.info(
    `Swap recorded for pool ${poolId}: ${amount0} / ${amount1} at block ${event.block.number}`
  );

  // Track Account buy/sell activity based on PING amount direction
  // Normalize PING token address for comparison
  const pingAddress = PING_TOKEN_ADDRESS.toLowerCase();
  const currency0Address = pool.currency0.toLowerCase();
  const currency1Address = pool.currency1.toLowerCase();

  // Determine if PING is currency0 or currency1
  const isPingCurrency0 = currency0Address === pingAddress;
  const isPingCurrency1 = currency1Address === pingAddress;

  // Only track buy/sell if this pool involves PING token
  if (isPingCurrency0 || isPingCurrency1) {
    // Skip buy/sell tracking if transaction.from is unavailable
    if (!event.transaction.from) {
      context.log.warn(
        `V4 Swap event missing transaction.from field at block ${event.block.number}. Skipping buy/sell tracking.`
      );
    } else {
      const txInitiator = sender.toLowerCase(); // In V4, sender is already the swap initiator
      const txHash = event.transaction.hash;
      const timestamp = BigInt(event.block.timestamp);

      // Determine if this is a BUY or SELL based on PING amount direction
      // In Uniswap V4, negative amount means tokens going into the pool (SELL)
      // Positive amount means tokens coming out of the pool (BUY)
      let isBuy = false;
      let isSell = false;
      let pingAmount = ZERO_BD;

      const amount0Raw = BigInt(amount0);
      const amount1Raw = BigInt(amount1);

      if (isPingCurrency0) {
        // PING is currency0
        // Positive amount0 = PING coming out of pool (BUY)
        // Negative amount0 = PING going into pool (SELL)
        if (amount0Raw > BigInt(0)) {
          isBuy = true;
          pingAmount = amount0Dec;
        } else if (amount0Raw < BigInt(0)) {
          isSell = true;
          pingAmount = amount0Dec;
        }
      } else if (isPingCurrency1) {
        // PING is currency1
        // Positive amount1 = PING coming out of pool (BUY)
        // Negative amount1 = PING going into pool (SELL)
        if (amount1Raw > BigInt(0)) {
          isBuy = true;
          pingAmount = amount1Dec;
        } else if (amount1Raw < BigInt(0)) {
          isSell = true;
          pingAmount = amount1Dec;
        }
      }

      // Update Account for BUY (user receives PING from pool)
      if (isBuy && pingAmount.gt(ZERO_BD)) {
        const accountId = `${chainId}_${txInitiator}`;
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
            `Updated BUY for account ${txInitiator}: ${pingAmount} PING (V4)`
          );
        }
      }

      // Update Account for SELL (user sends PING to pool)
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
            `Updated SELL for account ${txInitiator}: ${pingAmount} PING (V4)`
          );
        }
      }
    }
  }
});
