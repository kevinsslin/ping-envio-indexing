import { BigDecimal } from "generated";

/**
 * Contract addresses
 */
export const POOL_ADDRESS = "0xBc51DB8aEC659027AE0B0E468C0735418161A780";
export const TOKEN_ADDRESS = "0xd85c31854c2B0Fb40aaA9E2Fc4Da23C21f829d46";
export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

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
export const POOL_RELATION_FROM = "FROM_POOL";
export const POOL_RELATION_TO = "TO_POOL";
export const POOL_RELATION_NONE = "NONE";

/**
 * Token metadata (verified from contract on Base)
 * Token: 0xd85c31854c2B0Fb40aaA9E2Fc4Da23C21f829d46
 */
export const TOKEN_SYMBOL = "PING";
export const TOKEN_NAME = "Ping";
export const TOKEN_DECIMALS = 18n;
