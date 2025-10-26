/**
 * Test all GraphQL queries against the deployed indexer
 * Run with: node scripts/test-queries.js
 */

const GRAPHQL_ENDPOINT = "https://indexer.dev.hyperindex.xyz/7431dd5/v1/graphql";

async function query(gql, variables = {}) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: gql,
      variables,
    }),
  });

  const result = await response.json();
  if (result.errors) {
    throw new Error(JSON.stringify(result.errors, null, 2));
  }
  return result.data;
}

async function main() {
  console.log("🧪 Testing GraphQL Queries");
  console.log("Endpoint:", GRAPHQL_ENDPOINT);
  console.log("=".repeat(80));

  const results = {
    passed: [],
    failed: [],
  };

  // Test 1: Introspection - Get available types
  console.log("\n1️⃣  Testing Schema Introspection...");
  try {
    const data = await query(`
      query IntrospectionQuery {
        __schema {
          types {
            name
            kind
          }
        }
      }
    `);
    const types = data.__schema.types
      .filter((t) => !t.name.startsWith("__"))
      .filter((t) => t.kind === "OBJECT")
      .map((t) => t.name);
    console.log("✅ Available types:", types.join(", "));
    results.passed.push("Schema Introspection");
  } catch (error) {
    console.error("❌ Error:", error.message);
    results.failed.push({ test: "Schema Introspection", error: error.message });
  }

  // Test 2: Query Token
  console.log("\n2️⃣  Testing Token Query...");
  try {
    const data = await query(`
      query GetToken {
        Token(limit: 1) {
          id
          chainId
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
    if (data.Token && data.Token.length > 0) {
      console.log("✅ Token found:");
      console.log(JSON.stringify(data.Token[0], null, 2));
      results.passed.push("Token Query");
    } else {
      console.log("⚠️  No Token data found");
      results.failed.push({ test: "Token Query", error: "No data" });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    results.failed.push({ test: "Token Query", error: error.message });
  }

  // Test 3: Query Pool
  console.log("\n3️⃣  Testing Pool Query...");
  try {
    const data = await query(`
      query GetPool {
        Pool(limit: 1) {
          id
          chainId
          address
          token0
          token1
          feeTier
          liquidity
          sqrtPriceX96
          tick
          volumeToken0
          volumeToken1
          txCount
          totalValueLockedToken0
          totalValueLockedToken1
          createdAt
          lastSwapAt
        }
      }
    `);
    if (data.Pool && data.Pool.length > 0) {
      console.log("✅ Pool found:");
      console.log(JSON.stringify(data.Pool[0], null, 2));
      results.passed.push("Pool Query");
    } else {
      console.log("⚠️  No Pool data found");
      results.failed.push({ test: "Pool Query", error: "No data" });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    results.failed.push({ test: "Pool Query", error: error.message });
  }

  // Test 4: Query Transfers
  console.log("\n4️⃣  Testing Transfer Query...");
  try {
    const data = await query(`
      query GetTransfers {
        Transfer(limit: 5, order_by: {timestamp: desc}) {
          id
          chainId
          transactionHash
          timestamp
          blockNumber
          value
          isPoolRelated
          poolRelatedType
        }
      }
    `);
    if (data.Transfer && data.Transfer.length > 0) {
      console.log(`✅ Found ${data.Transfer.length} transfers`);
      console.log("Latest transfer:", JSON.stringify(data.Transfer[0], null, 2));
      results.passed.push("Transfer Query");
    } else {
      console.log("⚠️  No Transfer data found");
      results.failed.push({ test: "Transfer Query", error: "No data" });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    results.failed.push({ test: "Transfer Query", error: error.message });
  }

  // Test 5: Query Swaps
  console.log("\n5️⃣  Testing Swap Query...");
  try {
    const data = await query(`
      query GetSwaps {
        Swap(limit: 5, order_by: {timestamp: desc}) {
          id
          chainId
          transactionHash
          timestamp
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
    if (data.Swap && data.Swap.length > 0) {
      console.log(`✅ Found ${data.Swap.length} swaps`);
      console.log("Latest swap:", JSON.stringify(data.Swap[0], null, 2));
      results.passed.push("Swap Query");
    } else {
      console.log("⚠️  No Swap data found");
      results.failed.push({ test: "Swap Query", error: "No data" });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    results.failed.push({ test: "Swap Query", error: error.message });
  }

  // Test 6: Query Accounts
  console.log("\n6️⃣  Testing Account Query...");
  try {
    const data = await query(`
      query GetAccounts {
        Account(limit: 5, order_by: {balance: desc}) {
          id
          chainId
          address
          balance
          totalSent
          totalReceived
          transferCount
          firstTransferAt
          lastTransferAt
        }
      }
    `);
    if (data.Account && data.Account.length > 0) {
      console.log(`✅ Found ${data.Account.length} accounts`);
      console.log("Top account:", JSON.stringify(data.Account[0], null, 2));
      results.passed.push("Account Query");
    } else {
      console.log("⚠️  No Account data found");
      results.failed.push({ test: "Account Query", error: "No data" });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    results.failed.push({ test: "Account Query", error: error.message });
  }

  // Test 7: Query DailyTokenActivity
  console.log("\n7️⃣  Testing DailyTokenActivity Query...");
  try {
    const data = await query(`
      query GetDailyTokenActivity {
        DailyTokenActivity(limit: 5, order_by: {date: desc}) {
          id
          chainId
          date
          timestamp
          dailyTransfers
          dailyVolume
          dailyActiveAccounts
          newAccounts
        }
      }
    `);
    if (data.DailyTokenActivity && data.DailyTokenActivity.length > 0) {
      console.log(`✅ Found ${data.DailyTokenActivity.length} daily activity records`);
      console.log("Latest:", JSON.stringify(data.DailyTokenActivity[0], null, 2));
      results.passed.push("DailyTokenActivity Query");
    } else {
      console.log("⚠️  No DailyTokenActivity data found");
      results.failed.push({ test: "DailyTokenActivity Query", error: "No data" });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    results.failed.push({ test: "DailyTokenActivity Query", error: error.message });
  }

  // Test 8: Query DailyPoolActivity
  console.log("\n8️⃣  Testing DailyPoolActivity Query...");
  try {
    const data = await query(`
      query GetDailyPoolActivity {
        DailyPoolActivity(limit: 5, order_by: {date: desc}) {
          id
          chainId
          pool
          date
          timestamp
          dailySwaps
          dailyVolumeToken0
          dailyVolumeToken1
          liquidityStart
          liquidityEnd
          sqrtPriceX96Start
          sqrtPriceX96End
        }
      }
    `);
    if (data.DailyPoolActivity && data.DailyPoolActivity.length > 0) {
      console.log(`✅ Found ${data.DailyPoolActivity.length} daily pool activity records`);
      console.log("Latest:", JSON.stringify(data.DailyPoolActivity[0], null, 2));
      results.passed.push("DailyPoolActivity Query");
    } else {
      console.log("⚠️  No DailyPoolActivity data found");
      results.failed.push({ test: "DailyPoolActivity Query", error: "No data" });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    results.failed.push({ test: "DailyPoolActivity Query", error: error.message });
  }

  // Test 9: Query Pool-related Transfers
  console.log("\n9️⃣  Testing Pool-Related Transfers...");
  try {
    const data = await query(`
      query GetPoolTransfers {
        Transfer(
          limit: 5
          where: {isPoolRelated: {_eq: true}}
          order_by: {timestamp: desc}
        ) {
          id
          value
          isPoolRelated
          poolRelatedType
          timestamp
        }
      }
    `);
    if (data.Transfer && data.Transfer.length > 0) {
      console.log(`✅ Found ${data.Transfer.length} pool-related transfers`);
      console.log("Sample:", JSON.stringify(data.Transfer[0], null, 2));
      results.passed.push("Pool-Related Transfers Query");
    } else {
      console.log("⚠️  No pool-related transfers found");
      results.failed.push({ test: "Pool-Related Transfers Query", error: "No data" });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    results.failed.push({ test: "Pool-Related Transfers Query", error: error.message });
  }

  // Test 10: Aggregate Query - Total counts
  console.log("\n🔟 Testing Aggregate Queries...");
  try {
    const data = await query(`
      query GetCounts {
        Transfer_aggregate {
          aggregate {
            count
          }
        }
        Swap_aggregate {
          aggregate {
            count
          }
        }
        Account_aggregate {
          aggregate {
            count
          }
        }
      }
    `);
    console.log("✅ Aggregate counts:");
    console.log(`  - Transfers: ${data.Transfer_aggregate.aggregate.count}`);
    console.log(`  - Swaps: ${data.Swap_aggregate.aggregate.count}`);
    console.log(`  - Accounts: ${data.Account_aggregate.aggregate.count}`);
    results.passed.push("Aggregate Queries");
  } catch (error) {
    console.error("❌ Error:", error.message);
    results.failed.push({ test: "Aggregate Queries", error: error.message });
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 Test Summary");
  console.log("=".repeat(80));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);

  if (results.passed.length > 0) {
    console.log("\n✅ Passed tests:");
    results.passed.forEach((test, i) => console.log(`  ${i + 1}. ${test}`));
  }

  if (results.failed.length > 0) {
    console.log("\n❌ Failed tests:");
    results.failed.forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.test}`);
      console.log(`     Error: ${test.error}`);
    });
  }

  const successRate = (
    (results.passed.length / (results.passed.length + results.failed.length)) *
    100
  ).toFixed(1);
  console.log(`\n📈 Success Rate: ${successRate}%`);

  if (results.failed.length === 0) {
    console.log("\n🎉 All tests passed! Your indexer is working correctly!");
  } else {
    console.log("\n⚠️  Some tests failed. Please check the errors above.");
  }
}

main().catch(console.error);
