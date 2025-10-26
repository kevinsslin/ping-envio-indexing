/**
 * Swap event handler for Uniswap V3 Pool
 * Tracks swap events, pool statistics, and daily activity
 */
import { UniswapV3Pool, Pool, Swap, DailyPoolActivity } from "generated";
import {
  POOL_ADDRESS,
  TOKEN_ADDRESS,
  TOKEN_DECIMALS,
  ZERO_BD,
  ONE_BI,
  ONE_BD,
} from "../utils/constants";
import {
  convertTokenToDecimal,
  getDayId,
  getDayStartTimestamp,
  normalizeAddress,
} from "../utils/index";

// Pool configuration based on actual contract query
// Pool: 0xBc51DB8aEC659027AE0B0E468C0735418161A780 (USDC-PING on Base)
const TOKEN0_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"; // USDC
const TOKEN1_ADDRESS = TOKEN_ADDRESS; // PING (0xd85c31854c2B0Fb40aaA9E2Fc4Da23C21f829d46)
const TOKEN0_DECIMALS = 6n; // USDC has 6 decimals
const TOKEN1_DECIMALS = TOKEN_DECIMALS; // PING decimals from constants

// Fee tier: 3000 = 0.30%
const FEE_TIER = 3000n;

UniswapV3Pool.Swap.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  const poolId = `${chainId}_${normalizeAddress(POOL_ADDRESS)}`;
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

  // Convert amounts to decimal
  // In Uniswap V3, negative amount means tokens going into the pool
  // Positive amount means tokens coming out of the pool
  const amount0Raw = event.params.amount0;
  const amount1Raw = event.params.amount1;

  // Convert to BigDecimal, preserving sign
  const amount0 = convertTokenToDecimal(
    amount0Raw < 0 ? -amount0Raw : amount0Raw,
    TOKEN0_DECIMALS
  );
  const amount1 = convertTokenToDecimal(
    amount1Raw < 0 ? -amount1Raw : amount1Raw,
    TOKEN1_DECIMALS
  );

  // Apply sign back
  const amount0Signed = amount0Raw < 0 ? amount0.times(ZERO_BD.minus(ONE_BD)) : amount0;
  const amount1Signed = amount1Raw < 0 ? amount1.times(ZERO_BD.minus(ONE_BD)) : amount1;

  // For volume calculation, we use absolute values
  const amount0Abs = amount0;
  const amount1Abs = amount1;

  // Initialize or update Pool entity
  const poolEntity: Pool = pool
    ? {
        ...pool,
        liquidity: event.params.liquidity,
        sqrtPriceX96: event.params.sqrtPriceX96,
        tick: event.params.tick,
        volumeToken0: pool.volumeToken0.plus(amount0Abs),
        volumeToken1: pool.volumeToken1.plus(amount1Abs),
        txCount: pool.txCount + ONE_BI,
        lastSwapAt: BigInt(event.block.timestamp),
        // Note: totalValueLocked calculations would require price data
        // For now, we're not updating TVL in the swap handler
      }
    : {
        // First swap - initialize pool
        id: poolId,
        chainId,
        address: POOL_ADDRESS,
        token0: TOKEN0_ADDRESS,
        token1: TOKEN1_ADDRESS,
        feeTier: FEE_TIER,
        liquidity: event.params.liquidity,
        sqrtPriceX96: event.params.sqrtPriceX96,
        tick: event.params.tick,
        volumeToken0: amount0Abs,
        volumeToken1: amount1Abs,
        txCount: ONE_BI,
        totalValueLockedToken0: ZERO_BD,
        totalValueLockedToken1: ZERO_BD,
        createdAt: BigInt(event.block.timestamp),
        lastSwapAt: BigInt(event.block.timestamp),
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
    sender: event.params.sender,
    recipient: event.params.recipient,
    amount0: amount0Signed,
    amount1: amount1Signed,
    sqrtPriceX96: event.params.sqrtPriceX96,
    liquidity: event.params.liquidity,
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
        liquidityEnd: event.params.liquidity,
        sqrtPriceX96End: event.params.sqrtPriceX96,
      }
    : {
        id: `${poolId}_${dayId}`,
        chainId,
        pool: POOL_ADDRESS,
        date: dayId,
        timestamp: dayStartTimestamp,
        dailySwaps: ONE_BI,
        dailyVolumeToken0: amount0Abs,
        dailyVolumeToken1: amount1Abs,
        liquidityStart: event.params.liquidity,
        liquidityEnd: event.params.liquidity,
        sqrtPriceX96Start: event.params.sqrtPriceX96,
        sqrtPriceX96End: event.params.sqrtPriceX96,
      };

  // Save all entities
  context.Pool.set(poolEntity);
  context.Swap.set(swapEntity);
  context.DailyPoolActivity.set(updatedDailyActivity);
});
