/**
 * ERC20 Token Metadata Fetcher
 * Fetches token name, symbol, and decimals from contract using JSON-RPC calls
 */

const RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";

/**
 * Token metadata structure
 */
export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: bigint;
}

/**
 * JSON-RPC response type
 */
interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: string;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Make an eth_call to a contract
 */
async function call(to: string, data: string): Promise<string> {
  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
    });
    const result = (await response.json()) as JsonRpcResponse;

    if (result.error) {
      throw new Error(result.error.message || "RPC call failed");
    }

    if (!result.result) {
      throw new Error("No result returned from RPC call");
    }

    return result.result;
  } catch (error) {
    console.error(`RPC call failed for ${to} with data ${data}:`, error);
    throw error;
  }
}

/**
 * Decode a string from ABI-encoded hex data
 */
function decodeString(hexData: string): string {
  try {
    const hex = hexData.slice(2); // Remove 0x
    const length = parseInt(hex.slice(64, 128), 16);
    const bytes = hex.slice(128, 128 + length * 2);
    return Buffer.from(bytes, "hex").toString("utf8");
  } catch (error) {
    console.error("Failed to decode string:", error);
    return "UNKNOWN";
  }
}

/**
 * Fetch symbol for an ERC20 token
 */
async function fetchSymbol(tokenAddress: string): Promise<string> {
  try {
    const result = await call(tokenAddress, "0x95d89b41"); // symbol()
    return decodeString(result);
  } catch (error) {
    console.warn(`Failed to fetch symbol for ${tokenAddress}, using default`);
    return "UNKNOWN";
  }
}

/**
 * Fetch name for an ERC20 token
 */
async function fetchName(tokenAddress: string): Promise<string> {
  try {
    const result = await call(tokenAddress, "0x06fdde03"); // name()
    return decodeString(result);
  } catch (error) {
    console.warn(`Failed to fetch name for ${tokenAddress}, using default`);
    return "Unknown Token";
  }
}

/**
 * Fetch decimals for an ERC20 token
 */
async function fetchDecimals(tokenAddress: string): Promise<bigint> {
  try {
    const result = await call(tokenAddress, "0x313ce567"); // decimals()
    return BigInt(parseInt(result, 16));
  } catch (error) {
    console.warn(`Failed to fetch decimals for ${tokenAddress}, using default 18`);
    return 18n;
  }
}

/**
 * Fetch all metadata for an ERC20 token
 * @param tokenAddress - The token contract address
 * @returns Token metadata (symbol, name, decimals)
 */
export async function fetchTokenMetadata(
  tokenAddress: string
): Promise<TokenMetadata> {
  const normalizedAddress = tokenAddress.toLowerCase();

  console.log(`Fetching metadata for token: ${normalizedAddress}`);

  try {
    // Fetch all metadata in parallel for better performance
    const [symbol, name, decimals] = await Promise.all([
      fetchSymbol(normalizedAddress),
      fetchName(normalizedAddress),
      fetchDecimals(normalizedAddress),
    ]);

    console.log(
      `Token metadata fetched: ${symbol} (${name}) - ${decimals} decimals`
    );

    return {
      symbol,
      name,
      decimals,
    };
  } catch (error) {
    console.error(
      `Failed to fetch token metadata for ${normalizedAddress}:`,
      error
    );

    // Return safe defaults
    return {
      symbol: "UNKNOWN",
      name: "Unknown Token",
      decimals: 18n,
    };
  }
}
