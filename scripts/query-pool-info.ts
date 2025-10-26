/**
 * Query Uniswap V3 Pool information
 * Run with: pnpm tsx scripts/query-pool-info.ts
 */

const POOL_ADDRESS = "0xBc51DB8aEC659027AE0B0E468C0735418161A780";
const RPC_URL = "https://mainnet.base.org"; // Base mainnet RPC

// Uniswap V3 Pool ABI (only the functions we need)
const POOL_ABI = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function fee() external view returns (uint24)",
  "function tickSpacing() external view returns (int24)",
  "function liquidity() external view returns (uint128)",
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
];

// ERC20 ABI for getting token info
const ERC20_ABI = [
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function decimals() external view returns (uint8)",
];

async function main() {
  console.log("Querying Pool Info for:", POOL_ADDRESS);
  console.log("Network: Base (Chain ID: 8453)");
  console.log("\nUsing RPC:", RPC_URL);
  console.log("\n" + "=".repeat(60));

  try {
    // Query using fetch API (basic JSON-RPC)
    async function call(to: string, data: string) {
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
      const result = await response.json();
      return result.result;
    }

    // Function selectors
    const selectors = {
      token0: "0x0dfe1681",
      token1: "0xd21220a7",
      fee: "0xddca3f43",
      tickSpacing: "0xd0c93a7c",
      liquidity: "0x1a686502",
      slot0: "0x3850c7bd",
    };

    console.log("\n📊 Pool Information:");
    console.log("─".repeat(60));

    // Get token addresses
    const token0Result = await call(POOL_ADDRESS, selectors.token0);
    const token1Result = await call(POOL_ADDRESS, selectors.token1);
    const token0 = "0x" + token0Result.slice(-40);
    const token1 = "0x" + token1Result.slice(-40);

    console.log("\nToken Addresses:");
    console.log(`  token0: ${token0}`);
    console.log(`  token1: ${token1}`);

    // Get fee
    const feeResult = await call(POOL_ADDRESS, selectors.fee);
    const fee = parseInt(feeResult, 16);
    const feePercent = (fee / 10000).toFixed(2);

    console.log("\nFee Tier:");
    console.log(`  fee: ${fee} (${feePercent}%)`);

    // Get tick spacing
    const tickSpacingResult = await call(POOL_ADDRESS, selectors.tickSpacing);
    const tickSpacing = parseInt(tickSpacingResult, 16);

    console.log(`  tickSpacing: ${tickSpacing}`);

    // Get current liquidity
    const liquidityResult = await call(POOL_ADDRESS, selectors.liquidity);
    const liquidity = BigInt(liquidityResult);

    console.log("\nCurrent State:");
    console.log(`  liquidity: ${liquidity}`);

    // Query token info for both tokens
    console.log("\n" + "=".repeat(60));
    console.log("\n💰 Token Information:");
    console.log("─".repeat(60));

    for (const [name, address] of [
      ["Token0", token0],
      ["Token1", token1],
    ]) {
      console.log(`\n${name}: ${address}`);

      try {
        // Get symbol
        const symbolResult = await call(address, "0x95d89b41"); // symbol()
        const symbolHex = symbolResult.slice(2);
        // Decode string (simplified)
        const symbolLength = parseInt(symbolHex.slice(64, 128), 16);
        const symbolBytes = symbolHex.slice(128, 128 + symbolLength * 2);
        const symbol = Buffer.from(symbolBytes, "hex").toString("utf8");

        // Get name
        const nameResult = await call(address, "0x06fdde03"); // name()
        const nameHex = nameResult.slice(2);
        const nameLength = parseInt(nameHex.slice(64, 128), 16);
        const nameBytes = nameHex.slice(128, 128 + nameLength * 2);
        const tokenName = Buffer.from(nameBytes, "hex").toString("utf8");

        // Get decimals
        const decimalsResult = await call(address, "0x313ce567"); // decimals()
        const decimals = parseInt(decimalsResult, 16);

        console.log(`  Symbol: ${symbol}`);
        console.log(`  Name: ${tokenName}`);
        console.log(`  Decimals: ${decimals}`);
      } catch (error) {
        console.log(`  ⚠️  Could not fetch token metadata`);
      }
    }

    // Generate config for handlers
    console.log("\n" + "=".repeat(60));
    console.log("\n📝 Configuration for swap-handler.ts:");
    console.log("─".repeat(60));
    console.log(`
const TOKEN0_ADDRESS = "${token0}";
const TOKEN1_ADDRESS = "${token1}";
const TOKEN0_DECIMALS = 18n; // Update with actual decimals from above
const TOKEN1_DECIMALS = 18n; // Update with actual decimals from above
const FEE_TIER = ${fee}n; // ${feePercent}%
`);

    console.log("=".repeat(60));
    console.log("\n✅ Query completed successfully!");
    console.log(
      "\nPlease copy the configuration above to src/handlers/swap-handler.ts"
    );
    console.log("and update the decimals based on the token information.\n");
  } catch (error: any) {
    console.error("\n❌ Error querying pool:", error.message);
    console.error("\nPlease check:");
    console.error("1. The Pool address is correct");
    console.error("2. The RPC URL is accessible");
    console.error("3. You have internet connection");
  }
}

main();
