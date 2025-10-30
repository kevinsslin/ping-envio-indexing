/**
 * Test GraphQL Queries for All Entity Types
 * Run with: pnpm tsx scripts/test-queries.ts
 *
 * This script queries the production GraphQL endpoint and validates data for all entities
 */

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ||
  "https://indexer.hyperindex.xyz/1c6c77c/v1/graphql";

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
    throw new Error(`GraphQL Error: ${result.errors.map((e) => e.message).join(", ")}`);
  }

  if (!result.data) {
    throw new Error("No data returned from GraphQL query");
  }

  return result.data;
}

async function testToken() {
  console.log("\n📊 Testing Token Entity");
  console.log("=" .repeat(60));

  const result = await query<{ Token: Array<any> }>(`
    query {
      Token(limit: 5) {
        id
        address
        symbol
        name
        decimals
        totalSupply
        totalTransfers
        totalVolume
        holderCount
      }
    }
  `);

  console.log(`Found ${result.Token.length} tokens`);
  result.Token.forEach((token) => {
    console.log(`  ${token.symbol} (${token.name})`);
    console.log(`    Address: ${token.address}`);
    console.log(`    Decimals: ${token.decimals}`);
    console.log(`    Transfers: ${token.totalTransfers}`);
    console.log(`    Holders: ${token.holderCount}`);
    console.log(`    Volume: ${token.totalVolume}`);
  });

  return result.Token.length;
}

async function testPool() {
  console.log("\n🏊 Testing Pool Entity");
  console.log("=".repeat(60));

  const result = await query<{ Pool: Array<any> }>(`
    query {
      Pool(order_by: {txCount: desc}, limit: 10) {
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
      }
    }
  `);

  console.log(`Found ${result.Pool.length} pools`);
  result.Pool.forEach((pool) => {
    console.log(`  ${pool.token0Symbol}/${pool.token1Symbol} (fee: ${pool.feeTier / 10000}%)`);
    console.log(`    Address: ${pool.address}`);
    console.log(`    Active: ${pool.isActive}, Liquidity: ${pool.liquidity}`);
    console.log(`    Token0 Decimals: ${pool.token0Decimals}`);
    console.log(`    Token1 Decimals: ${pool.token1Decimals}`);
    console.log(`    Volume Token0: ${pool.volumeToken0}`);
    console.log(`    Volume Token1: ${pool.volumeToken1}`);
    console.log(`    Swap Count: ${pool.txCount}`);

    // Flag suspicious data
    if (pool.txCount > 0 && parseFloat(pool.volumeToken0) === 0) {
      console.log(`    ⚠️  WARNING: Pool has swaps but zero token0 volume!`);
    }
    if (pool.token0Decimals === "18" && pool.token0.toLowerCase() === "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913") {
      console.log(`    ⚠️  WARNING: USDC should have 6 decimals, not 18!`);
    }
  });

  return result.Pool.length;
}

async function testAccount() {
  console.log("\n👤 Testing Account Entity");
  console.log("=".repeat(60));

  const result = await query<{ Account: Array<any> }>(`
    query {
      Account(limit: 5, order_by: {balance: desc}) {
        id
        address
        balance
        totalSent
        totalReceived
        transferCount
        totalBuys
        totalSells
        totalBuyVolume
        totalSellVolume
        lastBuyAt
        lastSellAt
      }
    }
  `);

  console.log(`Found ${result.Account.length} accounts`);
  result.Account.forEach((account) => {
    console.log(`  ${account.address}`);
    console.log(`    Balance: ${account.balance}`);
    console.log(`    Transfers: ${account.transferCount}`);
    console.log(`    Buys: ${account.totalBuys}, Volume: ${account.totalBuyVolume}`);
    console.log(`    Sells: ${account.totalSells}, Volume: ${account.totalSellVolume}`);
  });

  return result.Account.length;
}

async function testSwap() {
  console.log("\n🔄 Testing Swap Entity");
  console.log("=".repeat(60));

  const result = await query<{ Swap: Array<any> }>(`
    query {
      Swap(limit: 5, order_by: {timestamp: desc}) {
        id
        timestamp
        pool_id
        sender
        recipient
        amount0
        amount1
        sqrtPriceX96
        liquidity
        tick
      }
    }
  `);

  console.log(`Found ${result.Swap.length} recent swaps`);
  result.Swap.forEach((swap) => {
    const date = new Date(Number(swap.timestamp) * 1000);
    console.log(`  Swap at ${date.toISOString()}`);
    console.log(`    Pool: ${swap.pool_id}`);
    console.log(`    Amount0: ${swap.amount0}`);
    console.log(`    Amount1: ${swap.amount1}`);
    console.log(`    Liquidity: ${swap.liquidity}`);
  });

  return result.Swap.length;
}

async function testTransfer() {
  console.log("\n💸 Testing Transfer Entity");
  console.log("=".repeat(60));

  const result = await query<{ Transfer: Array<any> }>(`
    query {
      Transfer(limit: 5, order_by: {timestamp: desc}) {
        id
        timestamp
        from_id
        to_id
        value
        isPoolRelated
        poolRelatedType
        relatedPool_id
      }
    }
  `);

  console.log(`Found ${result.Transfer.length} recent transfers`);
  result.Transfer.forEach((transfer) => {
    const date = new Date(Number(transfer.timestamp) * 1000);
    console.log(`  Transfer at ${date.toISOString()}`);
    console.log(`    Value: ${transfer.value}`);
    console.log(`    Pool Related: ${transfer.isPoolRelated} (${transfer.poolRelatedType})`);
    if (transfer.relatedPool_id) {
      console.log(`    Related Pool: ${transfer.relatedPool_id}`);
    }
  });

  return result.Transfer.length;
}

async function testDailyTokenActivity() {
  console.log("\n📅 Testing DailyTokenActivity Entity");
  console.log("=".repeat(60));

  const result = await query<{ DailyTokenActivity: Array<any> }>(`
    query {
      DailyTokenActivity(limit: 5, order_by: {timestamp: desc}) {
        id
        date
        timestamp
        dailyTransfers
        dailyVolume
        dailyActiveAccounts
        newAccounts
      }
    }
  `);

  console.log(`Found ${result.DailyTokenActivity.length} daily activity records`);
  result.DailyTokenActivity.forEach((activity) => {
    console.log(`  Date: ${activity.date}`);
    console.log(`    Transfers: ${activity.dailyTransfers}`);
    console.log(`    Volume: ${activity.dailyVolume}`);
    console.log(`    Active Accounts: ${activity.dailyActiveAccounts}`);
    console.log(`    New Accounts: ${activity.newAccounts}`);
  });

  return result.DailyTokenActivity.length;
}

async function testDailyPoolActivity() {
  console.log("\n📊 Testing DailyPoolActivity Entity");
  console.log("=".repeat(60));

  const result = await query<{ DailyPoolActivity: Array<any> }>(`
    query {
      DailyPoolActivity(limit: 5, order_by: {timestamp: desc}) {
        id
        date
        pool
        dailySwaps
        dailyVolumeToken0
        dailyVolumeToken1
        liquidityStart
        liquidityEnd
      }
    }
  `);

  console.log(`Found ${result.DailyPoolActivity.length} daily pool activity records`);
  result.DailyPoolActivity.forEach((activity) => {
    console.log(`  Date: ${activity.date}, Pool: ${activity.pool}`);
    console.log(`    Swaps: ${activity.dailySwaps}`);
    console.log(`    Volume Token0: ${activity.dailyVolumeToken0}`);
    console.log(`    Volume Token1: ${activity.dailyVolumeToken1}`);
    console.log(`    Liquidity: ${activity.liquidityStart} → ${activity.liquidityEnd}`);
  });

  return result.DailyPoolActivity.length;
}

async function main() {
  console.log("🧪 Testing All GraphQL Entities");
  console.log("Endpoint:", GRAPHQL_ENDPOINT);
  console.log("=" .repeat(60));

  try {
    const counts = {
      Token: await testToken(),
      Pool: await testPool(),
      Account: await testAccount(),
      Swap: await testSwap(),
      Transfer: await testTransfer(),
      DailyTokenActivity: await testDailyTokenActivity(),
      DailyPoolActivity: await testDailyPoolActivity(),
    };

    console.log("\n✅ Summary");
    console.log("=".repeat(60));
    Object.entries(counts).forEach(([entity, count]) => {
      console.log(`  ${entity}: ${count} records`);
    });

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

main();
