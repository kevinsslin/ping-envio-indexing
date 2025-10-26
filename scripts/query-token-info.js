/**
 * Query PING token information
 * Run with: node scripts/query-token-info.js
 */

const TOKEN_ADDRESS = "0xd85c31854c2B0Fb40aaA9E2Fc4Da23C21f829d46";
const RPC_URL = "https://mainnet.base.org";

async function main() {
  console.log("Querying Token Info for:", TOKEN_ADDRESS);
  console.log("Network: Base (Chain ID: 8453)\n");

  try {
    async function call(to, data) {
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
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.result;
    }

    console.log("📊 Token Information:");
    console.log("─".repeat(60));

    // Get decimals
    try {
      const decimalsResult = await call(TOKEN_ADDRESS, "0x313ce567");
      const decimals = parseInt(decimalsResult, 16);
      console.log(`\nDecimals: ${decimals}`);
    } catch (e) {
      console.log("\n⚠️  Decimals: Could not fetch (trying alternative method...)");

      // Try reading as bytes
      try {
        const bytesResult = await call(TOKEN_ADDRESS, "0x313ce567");
        console.log("Raw result:", bytesResult);
      } catch (e2) {
        console.log("Alternative method also failed");
      }
    }

    // Get symbol
    try {
      const symbolResult = await call(TOKEN_ADDRESS, "0x95d89b41");
      const symbolHex = symbolResult.slice(2);

      // Try different decoding methods
      // Method 1: Dynamic string
      try {
        const symbolLength = parseInt(symbolHex.slice(64, 128), 16);
        const symbolBytes = symbolHex.slice(128, 128 + symbolLength * 2);
        const symbol = Buffer.from(symbolBytes, "hex").toString("utf8").replace(/\0/g, '');
        console.log(`Symbol: ${symbol}`);
      } catch (e) {
        // Method 2: bytes32
        const symbolBytes = symbolHex.slice(0, 64);
        const symbol = Buffer.from(symbolBytes, "hex").toString("utf8").replace(/\0/g, '');
        console.log(`Symbol: ${symbol}`);
      }
    } catch (e) {
      console.log("Symbol: Could not fetch");
    }

    // Get name
    try {
      const nameResult = await call(TOKEN_ADDRESS, "0x06fdde03");
      const nameHex = nameResult.slice(2);

      try {
        const nameLength = parseInt(nameHex.slice(64, 128), 16);
        const nameBytes = nameHex.slice(128, 128 + nameLength * 2);
        const name = Buffer.from(nameBytes, "hex").toString("utf8").replace(/\0/g, '');
        console.log(`Name: ${name}`);
      } catch (e) {
        const nameBytes = nameHex.slice(0, 64);
        const name = Buffer.from(nameBytes, "hex").toString("utf8").replace(/\0/g, '');
        console.log(`Name: ${name}`);
      }
    } catch (e) {
      console.log("Name: Could not fetch");
    }

    // Get total supply
    try {
      const supplyResult = await call(TOKEN_ADDRESS, "0x18160ddd");
      const supply = BigInt(supplyResult);
      console.log(`Total Supply (raw): ${supply}`);
    } catch (e) {
      console.log("Total Supply: Could not fetch");
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n💡 Tip: If the token doesn't follow standard ERC20,");
    console.log("you may need to check the contract on Basescan:");
    console.log(`https://basescan.org/address/${TOKEN_ADDRESS}#readContract\n`);

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

main();
