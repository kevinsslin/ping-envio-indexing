import { BigDecimal } from "generated";

/**
 * Contract addresses
 */
export const PING_TOKEN_ADDRESS = "0xd85c31854c2B0Fb40aaA9E2Fc4Da23C21f829d46";
export const UNISWAP_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

// Legacy constant for backwards compatibility
export const TOKEN_ADDRESS = PING_TOKEN_ADDRESS;
export const POOL_ADDRESS = "0xBc51DB8aEC659027AE0B0E468C0735418161A780"; // Known PING-USDC pool

/**
 * BigInt constants
 */
export const ZERO_BI = BigInt(0);
export const ONE_BI = BigInt(1);

/**
 * BigDecimal constants
 */
export const ZERO_BD = new BigDecimal("0");
export const ONE_BD = new BigDecimal("1");

/**
 * Pool relation types
 */
export const POOL_RELATION_BUY = "BUY";   // Buying from pool (pool -> user)
export const POOL_RELATION_SELL = "SELL"; // Selling to pool (user -> pool)
export const POOL_RELATION_NONE = "NONE";

/**
 * Token metadata (verified from contract on Base)
 * Token: 0xd85c31854c2B0Fb40aaA9E2Fc4Da23C21f829d46
 */
export const TOKEN_SYMBOL = "PING";
export const TOKEN_NAME = "Ping";
export const TOKEN_DECIMALS = 18n;
