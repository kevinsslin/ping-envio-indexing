import { BigDecimal } from "generated";

/**
 * Uniswap V4 Tick Math Utilities
 *
 * These functions are used to calculate token amounts from liquidity changes
 * in V4's ModifyLiquidity events, which only emit liquidityDelta instead of
 * actual token amounts like V3's Mint/Burn events.
 */

// Constants for tick math calculations
const Q96 = BigInt(2) ** BigInt(96);
const MIN_TICK = -887272;
const MAX_TICK = 887272;

/**
 * Calculate sqrt(1.0001^tick) as a Q64.96 number
 * This is a simplified implementation - in production, you may want to use
 * the exact implementation from @uniswap/v3-sdk or similar
 */
export function getSqrtRatioAtTick(tick: number): bigint {
  // Ensure tick is within valid range
  if (tick < MIN_TICK || tick > MAX_TICK) {
    throw new Error(`Tick ${tick} out of range [${MIN_TICK}, ${MAX_TICK}]`);
  }

  const absTick = tick < 0 ? -tick : tick;

  // Calculate ratio using approximation
  // ratio = 1.0001^tick = sqrt(price)
  // This is a simplified calculation; production should use the full implementation

  let ratio = Q96;

  // Use bit shifts and multiplications to approximate 1.0001^tick
  // This is a simplified version - full implementation would use the exact bit manipulation
  // from Uniswap's TickMath library

  if (tick === 0) {
    return Q96;
  }

  // Approximation for demonstration
  // In production, use the exact TickMath implementation or library
  const baseRatio = 1.0001;
  const sqrtPrice = Math.sqrt(Math.pow(baseRatio, tick));
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * Number(Q96)));

  return sqrtPriceX96;
}

/**
 * Calculate the amount of token0 needed for a given liquidity delta
 *
 * Formula: amount0 = liquidity * (sqrt(upper) - sqrt(lower)) / (sqrt(upper) * sqrt(lower))
 *
 * @param sqrtPriceAX96 - sqrt price at lower tick (Q64.96)
 * @param sqrtPriceBX96 - sqrt price at upper tick (Q64.96)
 * @param liquidity - liquidity amount (can be negative for burns)
 * @returns amount0 delta
 */
export function getAmount0Delta(
  sqrtPriceAX96: bigint,
  sqrtPriceBX96: bigint,
  liquidity: bigint
): bigint {
  // Ensure sqrtPriceAX96 < sqrtPriceBX96
  let sqrtPriceLowerX96 = sqrtPriceAX96;
  let sqrtPriceUpperX96 = sqrtPriceBX96;
  if (sqrtPriceAX96 > sqrtPriceBX96) {
    sqrtPriceLowerX96 = sqrtPriceBX96;
    sqrtPriceUpperX96 = sqrtPriceAX96;
  }

  if (liquidity < BigInt(0)) {
    // For burns (negative liquidity)
    return -getAmount0DeltaHelper(sqrtPriceLowerX96, sqrtPriceUpperX96, -liquidity, false);
  } else {
    // For mints (positive liquidity)
    return getAmount0DeltaHelper(sqrtPriceLowerX96, sqrtPriceUpperX96, liquidity, true);
  }
}

/**
 * Helper function for amount0 delta calculation
 */
function getAmount0DeltaHelper(
  sqrtPriceLowerX96: bigint,
  sqrtPriceUpperX96: bigint,
  liquidity: bigint,
  roundUp: boolean
): bigint {
  const numerator = liquidity * (sqrtPriceUpperX96 - sqrtPriceLowerX96);
  const denominator = sqrtPriceUpperX96 * sqrtPriceLowerX96;

  if (roundUp) {
    // Round up for more conservative amounts
    return (numerator * Q96 + denominator - BigInt(1)) / denominator;
  } else {
    // Round down
    return (numerator * Q96) / denominator;
  }
}

/**
 * Calculate the amount of token1 needed for a given liquidity delta
 *
 * Formula: amount1 = liquidity * (sqrt(upper) - sqrt(lower))
 *
 * @param sqrtPriceAX96 - sqrt price at lower tick (Q64.96)
 * @param sqrtPriceBX96 - sqrt price at upper tick (Q64.96)
 * @param liquidity - liquidity amount (can be negative for burns)
 * @returns amount1 delta
 */
export function getAmount1Delta(
  sqrtPriceAX96: bigint,
  sqrtPriceBX96: bigint,
  liquidity: bigint
): bigint {
  // Ensure sqrtPriceAX96 < sqrtPriceBX96
  let sqrtPriceLowerX96 = sqrtPriceAX96;
  let sqrtPriceUpperX96 = sqrtPriceBX96;
  if (sqrtPriceAX96 > sqrtPriceBX96) {
    sqrtPriceLowerX96 = sqrtPriceBX96;
    sqrtPriceUpperX96 = sqrtPriceAX96;
  }

  if (liquidity < BigInt(0)) {
    // For burns (negative liquidity)
    return -getAmount1DeltaHelper(sqrtPriceLowerX96, sqrtPriceUpperX96, -liquidity, false);
  } else {
    // For mints (positive liquidity)
    return getAmount1DeltaHelper(sqrtPriceLowerX96, sqrtPriceUpperX96, liquidity, true);
  }
}

/**
 * Helper function for amount1 delta calculation
 */
function getAmount1DeltaHelper(
  sqrtPriceLowerX96: bigint,
  sqrtPriceUpperX96: bigint,
  liquidity: bigint,
  roundUp: boolean
): bigint {
  const diff = sqrtPriceUpperX96 - sqrtPriceLowerX96;

  if (roundUp) {
    // Round up for more conservative amounts
    return (liquidity * diff + Q96 - BigInt(1)) / Q96;
  } else {
    // Round down
    return (liquidity * diff) / Q96;
  }
}

/**
 * Calculate token amounts for a liquidity position
 * This determines which calculation to use based on the current price
 *
 * @param currentSqrtPriceX96 - current pool sqrt price
 * @param sqrtPriceLowerX96 - lower tick sqrt price
 * @param sqrtPriceUpperX96 - upper tick sqrt price
 * @param liquidityDelta - change in liquidity
 * @returns object with amount0 and amount1
 */
export function getLiquidityAmounts(
  currentSqrtPriceX96: bigint,
  sqrtPriceLowerX96: bigint,
  sqrtPriceUpperX96: bigint,
  liquidityDelta: bigint
): { amount0: bigint; amount1: bigint } {
  if (currentSqrtPriceX96 <= sqrtPriceLowerX96) {
    // Current price below range - only amount0
    return {
      amount0: getAmount0Delta(sqrtPriceLowerX96, sqrtPriceUpperX96, liquidityDelta),
      amount1: BigInt(0),
    };
  } else if (currentSqrtPriceX96 < sqrtPriceUpperX96) {
    // Current price within range - both amounts
    return {
      amount0: getAmount0Delta(currentSqrtPriceX96, sqrtPriceUpperX96, liquidityDelta),
      amount1: getAmount1Delta(sqrtPriceLowerX96, currentSqrtPriceX96, liquidityDelta),
    };
  } else {
    // Current price above range - only amount1
    return {
      amount0: BigInt(0),
      amount1: getAmount1Delta(sqrtPriceLowerX96, sqrtPriceUpperX96, liquidityDelta),
    };
  }
}

/**
 * Convert bigint to BigDecimal with proper decimals
 */
export function convertToDecimal(amount: bigint, decimals: bigint): BigDecimal {
  const divisor = BigInt(10) ** decimals;
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;

  // Convert to decimal string
  const decimalStr = `${integerPart}.${fractionalPart.toString().padStart(Number(decimals), '0')}`;
  return new BigDecimal(decimalStr);
}

/**
 * Get absolute value of bigint
 */
export function abs(value: bigint): bigint {
  return value < BigInt(0) ? -value : value;
}
