import { BigDecimal } from "generated";
import { ZERO_BD, ZERO_BI } from "./constants";

/**
 * Convert token amount to decimal based on token decimals
 * @param tokenAmount - The raw token amount (BigInt)
 * @param decimals - The number of decimals for the token
 * @returns BigDecimal representation of the token amount
 */
export function convertTokenToDecimal(
  tokenAmount: bigint,
  decimals: bigint
): BigDecimal {
  if (decimals == ZERO_BI) {
    return new BigDecimal(tokenAmount.toString());
  }
  return new BigDecimal(tokenAmount.toString()).div(
    exponentToBigDecimal(decimals)
  );
}

/**
 * Create a BigDecimal representing 10^decimals
 * Used for converting token amounts
 * @param decimals - The number of decimals
 * @returns BigDecimal representation of 10^decimals
 */
export function exponentToBigDecimal(decimals: bigint): BigDecimal {
  let resultString = "1";

  for (let i = 0; i < Number(decimals); i++) {
    resultString += "0";
  }

  return new BigDecimal(resultString);
}

/**
 * Safe division that returns 0 if denominator is 0
 * @param amount0 - Numerator
 * @param amount1 - Denominator
 * @returns Division result or 0 if denominator is 0
 */
export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
  if (amount1.eq(ZERO_BD)) {
    return ZERO_BD;
  }
  return amount0.div(amount1);
}

/**
 * Get date string in YYYY-MM-DD format from timestamp
 * @param timestamp - Unix timestamp in seconds
 * @returns Date string in YYYY-MM-DD format
 */
export function getDayId(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get start of day timestamp from a given timestamp
 * @param timestamp - Unix timestamp in seconds
 * @returns Timestamp of the start of the day (00:00:00 UTC)
 */
export function getDayStartTimestamp(timestamp: bigint): bigint {
  const date = new Date(Number(timestamp) * 1000);
  date.setUTCHours(0, 0, 0, 0);
  return BigInt(Math.floor(date.getTime() / 1000));
}

/**
 * Convert hex string to BigInt
 * @param hex - Hex string (with or without 0x prefix)
 * @returns BigInt representation
 */
export function hexToBigInt(hex: string): bigint {
  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }
  return BigInt(`0x${hex}`);
}

/**
 * Normalize address to lowercase
 * @param address - Ethereum address
 * @returns Lowercase address
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}
