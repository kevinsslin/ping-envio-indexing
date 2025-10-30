/**
 * ERC20 Token Metadata
 * Uses hardcoded metadata for known Base tokens since fetch() is not available in Envio runtime
 */

/**
 * Token metadata structure
 */
export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: bigint;
}

/**
 * Known token metadata on Base chain (chainId: 8453)
 * This is the source of truth for token metadata to ensure correct decimal handling
 *
 * CRITICAL: USDC has 6 decimals, not 18!
 */
const KNOWN_TOKENS: Record<string, TokenMetadata> = {
  // USDC on Base - 6 decimals (CRITICAL!)
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6n,
  },

  // WETH on Base - 18 decimals
  "0x4200000000000000000000000000000000000006": {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18n,
  },

  // DAI on Base - 18 decimals
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": {
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18n,
  },

  // PING token - 18 decimals
  "0xd85c31854c2b0fb40aaa9e2fc4da23c21f829d46": {
    symbol: "PING",
    name: "Ping",
    decimals: 18n,
  },

  // cbETH on Base - 18 decimals
  "0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22": {
    symbol: "cbETH",
    name: "Coinbase Wrapped Staked ETH",
    decimals: 18n,
  },

  // USDbC (Bridged USDC) on Base - 6 decimals
  "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": {
    symbol: "USDbC",
    name: "USD Base Coin",
    decimals: 6n,
  },
};

/**
 * Fetch token metadata for a given token address
 *
 * NOTE: This function uses hardcoded values because Envio's runtime environment
 * does not support fetch() API for external RPC calls. For dynamic token metadata,
 * Envio's Effect system would need to be implemented.
 *
 * @param tokenAddress - The token contract address
 * @returns Token metadata (symbol, name, decimals)
 */
export async function fetchTokenMetadata(
  tokenAddress: string
): Promise<TokenMetadata> {
  const normalizedAddress = tokenAddress.toLowerCase();

  // Check if token is in our known tokens map
  if (KNOWN_TOKENS[normalizedAddress]) {
    const metadata = KNOWN_TOKENS[normalizedAddress];
    console.log(
      `Token metadata (hardcoded): ${metadata.symbol} (${metadata.name}) - ${metadata.decimals} decimals`
    );
    return metadata;
  }

  // Unknown token - log warning and return defaults
  console.warn(
    `Unknown token ${normalizedAddress} - using defaults (UNKNOWN, 18 decimals). ` +
    `Consider adding to KNOWN_TOKENS map if this is a well-known token.`
  );

  return {
    symbol: "UNKNOWN",
    name: "Unknown Token",
    decimals: 18n, // Most ERC20 tokens use 18 decimals
  };
}

/**
 * Add a new token to the known tokens map (for future use)
 * This can be called from handlers if needed to dynamically register tokens
 */
export function registerToken(
  address: string,
  metadata: TokenMetadata
): void {
  const normalizedAddress = address.toLowerCase();
  KNOWN_TOKENS[normalizedAddress] = metadata;
  console.log(
    `Registered token: ${metadata.symbol} (${metadata.name}) at ${normalizedAddress}`
  );
}
