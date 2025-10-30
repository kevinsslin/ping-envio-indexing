/**
 * Validate Pool Data
 * Run with: pnpm tsx scripts/validate-pools.ts
 *
 * This script specifically validates pool data for common issues:
 * - Incorrect token decimals (USDC should be 6, not 18)
 * - Zero volumes with non-zero swap counts
 * - Suspicious volume ratios
 */

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ||
  "https://indexer.hyperindex.xyz/1c6c77c/v1/graphql";

interface Pool {
  id: string;
  address: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Name: string;
  token1Name: string;
  token0Decimals: string;
  token1Decimals: string;
  feeTier: string;
  liquidity: string;
  isActive: boolean;
  volumeToken0: string;
  volumeToken1: string;
  txCount: string;
  createdAt: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function query<T>(gql: string): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql }),
  });

  const result = (await response.json()) as GraphQLResponse<T>;

  if (result.errors) {
    throw new Error(
      `GraphQL Error: ${result.errors.map((e) => e.message).join(", ")}`
    );
  }

  if (!result.data) {
    throw new Error("No data returned from GraphQL query");
  }

  return result.data;
}

async function getAllPools(): Promise<Pool[]> {
  const result = await query<{ Pool: Pool[] }>(`
    query {
      Pool(order_by: {txCount: desc}) {
        id
        address
        token0
        token1
        token0Symbol
        token1Symbol
        token0Name
        token1Name
        token0Decimals
        token1Decimals
        feeTier
        liquidity
        isActive
        volumeToken0
        volumeToken1
        txCount
        createdAt
      }
    }
  `);

  return result.Pool;
}

function validateDecimals(pool: Pool): string[] {
  const issues: string[] = [];

  // Known tokens with specific decimals
  const USDC_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
  const USDbC_ADDRESS = "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca";
  const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
  const PING_ADDRESS = "0xd85c31854c2b0fb40aaa9e2fc4da23c21f829d46";

  // Validate token0
  if (
    pool.token0.toLowerCase() === USDC_ADDRESS &&
    pool.token0Decimals !== "6"
  ) {
    issues.push(
      `❌ Token0 (USDC) has wrong decimals: ${pool.token0Decimals} (should be 6)`
    );
  }

  if (
    pool.token0.toLowerCase() === USDbC_ADDRESS &&
    pool.token0Decimals !== "6"
  ) {
    issues.push(
      `❌ Token0 (USDbC) has wrong decimals: ${pool.token0Decimals} (should be 6)`
    );
  }

  if (
    (pool.token0.toLowerCase() === WETH_ADDRESS ||
      pool.token0.toLowerCase() === PING_ADDRESS) &&
    pool.token0Decimals !== "18"
  ) {
    issues.push(
      `❌ Token0 (${pool.token0Symbol}) has wrong decimals: ${pool.token0Decimals} (should be 18)`
    );
  }

  // Validate token1
  if (
    pool.token1.toLowerCase() === USDC_ADDRESS &&
    pool.token1Decimals !== "6"
  ) {
    issues.push(
      `❌ Token1 (USDC) has wrong decimals: ${pool.token1Decimals} (should be 6)`
    );
  }

  if (
    pool.token1.toLowerCase() === USDbC_ADDRESS &&
    pool.token1Decimals !== "6"
  ) {
    issues.push(
      `❌ Token1 (USDbC) has wrong decimals: ${pool.token1Decimals} (should be 6)`
    );
  }

  if (
    (pool.token1.toLowerCase() === WETH_ADDRESS ||
      pool.token1.toLowerCase() === PING_ADDRESS) &&
    pool.token1Decimals !== "18"
  ) {
    issues.push(
      `❌ Token1 (${pool.token1Symbol}) has wrong decimals: ${pool.token1Decimals} (should be 18)`
    );
  }

  return issues;
}

function validateVolumes(pool: Pool): string[] {
  const issues: string[] = [];
  const txCount = parseInt(pool.txCount);
  const volumeToken0 = parseFloat(pool.volumeToken0);
  const volumeToken1 = parseFloat(pool.volumeToken1);

  // Check for zero volumes with swaps
  if (txCount > 0 && volumeToken0 === 0) {
    issues.push(
      `⚠️  Pool has ${txCount} swaps but ZERO token0 volume - likely decimal issue`
    );
  }

  if (txCount > 0 && volumeToken1 === 0) {
    issues.push(
      `⚠️  Pool has ${txCount} swaps but ZERO token1 volume - likely decimal issue`
    );
  }

  // Check for suspiciously small volumes relative to swap count
  if (txCount > 100 && volumeToken0 < 0.01) {
    issues.push(
      `⚠️  Pool has ${txCount} swaps but extremely low token0 volume (${volumeToken0}) - likely decimal issue`
    );
  }

  if (txCount > 100 && volumeToken1 < 0.01) {
    issues.push(
      `⚠️  Pool has ${txCount} swaps but extremely low token1 volume (${volumeToken1}) - likely decimal issue`
    );
  }

  // Check for extreme volume ratios (might indicate decimal mismatch)
  if (volumeToken0 > 0 && volumeToken1 > 0) {
    const ratio = volumeToken0 / volumeToken1;
    // If volumes differ by more than 10^9, likely a decimal issue
    if (ratio > 1e9 || ratio < 1e-9) {
      issues.push(
        `⚠️  Extreme volume ratio (${ratio.toExponential(2)}) - possible decimal mismatch`
      );
    }
  }

  return issues;
}

async function main() {
  console.log("🔍 Validating Pool Data");
  console.log("Endpoint:", GRAPHQL_ENDPOINT);
  console.log("=".repeat(80));

  try {
    const pools = await getAllPools();
    console.log(`\nFound ${pools.length} pools\n`);

    let totalIssues = 0;
    const poolsWithIssues: Pool[] = [];

    // Validate each pool
    for (const pool of pools) {
      const decimalIssues = validateDecimals(pool);
      const volumeIssues = validateVolumes(pool);
      const allIssues = [...decimalIssues, ...volumeIssues];

      if (allIssues.length > 0) {
        poolsWithIssues.push(pool);
        totalIssues += allIssues.length;

        console.log(`\n🏊 Pool: ${pool.token0Symbol}/${pool.token1Symbol}`);
        console.log(`   Address: ${pool.address}`);
        console.log(`   Fee Tier: ${parseInt(pool.feeTier) / 10000}%`);
        console.log(`   Swaps: ${pool.txCount}`);
        console.log(`   Token0: ${pool.token0} (${pool.token0Decimals} decimals)`);
        console.log(`   Token1: ${pool.token1} (${pool.token1Decimals} decimals)`);
        console.log(`   Volume Token0: ${pool.volumeToken0}`);
        console.log(`   Volume Token1: ${pool.volumeToken1}`);
        console.log(`   Issues:`);
        allIssues.forEach((issue) => console.log(`     ${issue}`));
      }
    }

    // Summary by volume
    console.log("\n\n📊 Pools by Volume (Top 10)");
    console.log("=".repeat(80));
    const sortedByVolume = [...pools].sort(
      (a, b) => parseFloat(b.volumeToken1) - parseFloat(a.volumeToken1)
    );
    sortedByVolume.slice(0, 10).forEach((pool, i) => {
      console.log(
        `${i + 1}. ${pool.token0Symbol}/${pool.token1Symbol}: ` +
          `Token0=${pool.volumeToken0}, Token1=${pool.volumeToken1}, ` +
          `Swaps=${pool.txCount}`
      );
    });

    // Summary by liquidity
    console.log("\n\n💧 Pools by Liquidity (Top 10)");
    console.log("=".repeat(80));
    const sortedByLiquidity = [...pools].sort(
      (a, b) => parseFloat(b.liquidity) - parseFloat(a.liquidity)
    );
    sortedByLiquidity.slice(0, 10).forEach((pool, i) => {
      console.log(
        `${i + 1}. ${pool.token0Symbol}/${pool.token1Symbol}: ` +
          `Liquidity=${pool.liquidity}, Active=${pool.isActive}`
      );
    });

    // Final summary
    console.log("\n\n✅ Validation Summary");
    console.log("=".repeat(80));
    console.log(`Total Pools: ${pools.length}`);
    console.log(`Pools with Issues: ${poolsWithIssues.length}`);
    console.log(`Total Issues Found: ${totalIssues}`);

    if (totalIssues > 0) {
      console.log(
        "\n⚠️  Issues found! Review the output above for details."
      );
      console.log("💡 Tip: If decimals are wrong, re-index after fixing token-metadata.ts");
      process.exit(1);
    } else {
      console.log("\n🎉 All pools validated successfully!");
    }
  } catch (error) {
    console.error("\n❌ Validation failed:", error);
    process.exit(1);
  }
}

main();
