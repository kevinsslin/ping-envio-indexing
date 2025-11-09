/**
 * Test Unified DailyPoolActivity
 * Verifies that V3 and V4 pool daily activity data is unified in one entity
 */

const GRAPHQL_ENDPOINT = "https://indexer.hyperindex.xyz/1c6c77c/v1/graphql";

async function query(q: string) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q }),
  });
  const result = await response.json();
  return result.data;
}

async function testUnifiedDailyActivity() {
  console.log("🔍 Testing Unified DailyPoolActivity Schema\n");
  console.log("=" .repeat(80));

  // Test 1: Unified query for both V3 and V4
  console.log("\n📊 Test 1: Unified Query (All Pool Versions)");
  const allData = await query(`
    query {
      DailyPoolActivity(
        order_by: {timestamp: desc}
        limit: 20
      ) {
        id
        poolIdentifier
        poolVersion
        date
        dailySwaps
        dailyVolume0
        dailyVolume1
        liquidityStart
        liquidityEnd
      }
    }
  `);

  if (allData.DailyPoolActivity.length > 0) {
    console.log(`✅ Found ${allData.DailyPoolActivity.length} daily activities`);

    const v3Count = allData.DailyPoolActivity.filter((d: any) => d.poolVersion === "V3").length;
    const v4Count = allData.DailyPoolActivity.filter((d: any) => d.poolVersion === "V4").length;

    console.log(`   V3 entries: ${v3Count}`);
    console.log(`   V4 entries: ${v4Count}`);

    console.log("\nRecent Activities:");
    allData.DailyPoolActivity.slice(0, 10).forEach((day: any, i: number) => {
      const poolId = day.poolIdentifier.substring(0, 15);
      console.log(`  ${i + 1}. [${day.poolVersion}] ${day.date} - ${poolId}...`);
      console.log(`     Swaps: ${day.dailySwaps} | Vol: ${parseFloat(day.dailyVolume0).toFixed(2)} / ${parseFloat(day.dailyVolume1).toFixed(2)}`);
    });
  } else {
    console.log("❌ No DailyPoolActivity data found!");
  }

  // Test 2: Filter by V3 only
  console.log("\n\n📊 Test 2: V3 Only Filter");
  const v3Data = await query(`
    query {
      DailyPoolActivity(
        where: {poolVersion: {_eq: "V3"}}
        order_by: {timestamp: desc}
        limit: 5
      ) {
        poolIdentifier
        poolVersion
        date
        dailySwaps
        dailyVolume0
        dailyVolume1
        dailyLiquidityAdds
        dailyLiquidityRemoves
      }
    }
  `);

  if (v3Data.DailyPoolActivity.length > 0) {
    console.log(`✅ Found ${v3Data.DailyPoolActivity.length} V3 daily activities`);
    v3Data.DailyPoolActivity.forEach((day: any, i: number) => {
      console.log(`  ${i + 1}. ${day.date} - ${day.poolIdentifier.substring(0, 15)}...`);
      console.log(`     Swaps: ${day.dailySwaps} | Vol: ${parseFloat(day.dailyVolume0).toFixed(2)}`);
      console.log(`     Liquidity Changes: ${day.dailyLiquidityAdds || 'null'} / ${day.dailyLiquidityRemoves || 'null'} (expected null for V3)`);
    });
  } else {
    console.log("⚠️  No V3 data found (might be waiting for reindex)");
  }

  // Test 3: Filter by V4 only
  console.log("\n\n📊 Test 3: V4 Only Filter");
  const v4Data = await query(`
    query {
      DailyPoolActivity(
        where: {poolVersion: {_eq: "V4"}}
        order_by: {timestamp: desc}
        limit: 5
      ) {
        poolIdentifier
        poolVersion
        date
        dailySwaps
        dailyVolume0
        dailyVolume1
        dailyLiquidityAdds
        dailyLiquidityRemoves
      }
    }
  `);

  if (v4Data.DailyPoolActivity.length > 0) {
    console.log(`✅ Found ${v4Data.DailyPoolActivity.length} V4 daily activities`);
    v4Data.DailyPoolActivity.forEach((day: any, i: number) => {
      console.log(`  ${i + 1}. ${day.date} - ${day.poolIdentifier.substring(0, 20)}...`);
      console.log(`     Swaps: ${day.dailySwaps} | Vol: ${parseFloat(day.dailyVolume0).toFixed(2)}`);
      console.log(`     Liquidity Changes: +${day.dailyLiquidityAdds} / -${day.dailyLiquidityRemoves}`);
    });
  } else {
    console.log("⚠️  No V4 data found (might be waiting for reindex)");
  }

  // Test 4: Aggregate comparison
  console.log("\n\n📊 Test 4: V3 vs V4 Comparison by Date");
  const today = new Date().toISOString().split('T')[0];

  const comparisonData = await query(`
    query {
      v3Today: DailyPoolActivity(
        where: {date: {_eq: "${today}"}, poolVersion: {_eq: "V3"}}
      ) {
        dailySwaps
        dailyVolume0
        dailyVolume1
      }
      v4Today: DailyPoolActivity(
        where: {date: {_eq: "${today}"}, poolVersion: {_eq: "V4"}}
      ) {
        dailySwaps
        dailyVolume0
        dailyVolume1
      }
    }
  `);

  const v3TotalSwaps = comparisonData.v3Today.reduce((sum: number, d: any) => sum + parseInt(d.dailySwaps), 0);
  const v4TotalSwaps = comparisonData.v4Today.reduce((sum: number, d: any) => sum + parseInt(d.dailySwaps), 0);

  console.log(`Date: ${today}`);
  console.log(`  V3 Pools Active: ${comparisonData.v3Today.length} | Total Swaps: ${v3TotalSwaps}`);
  console.log(`  V4 Pools Active: ${comparisonData.v4Today.length} | Total Swaps: ${v4TotalSwaps}`);

  // Summary
  console.log("\n\n" + "=".repeat(80));
  console.log("\n📝 SUMMARY\n");
  console.log("=" .repeat(80));

  const hasData = allData.DailyPoolActivity.length > 0;
  const hasV3 = v3Data.DailyPoolActivity.length > 0;
  const hasV4 = v4Data.DailyPoolActivity.length > 0;
  const bothVersions = hasV3 && hasV4;

  console.log(`  Unified Schema: ${hasData ? "✅ WORKING" : "❌ NO DATA"}`);
  console.log(`  V3 Filter: ${hasV3 ? "✅ WORKING" : "⚠️  WAITING FOR REINDEX"}`);
  console.log(`  V4 Filter: ${hasV4 ? "✅ WORKING" : "⚠️  WAITING FOR REINDEX"}`);
  console.log(`  Both Versions: ${bothVersions ? "✅ UNIFIED" : "⚠️  PARTIAL"}`);

  if (bothVersions) {
    console.log("\n🎉 Unified DailyPoolActivity schema is working correctly!");
    console.log("   Both V3 and V4 data are accessible through a single entity.");
  } else if (hasData) {
    console.log("\n⚠️  Schema is working but waiting for reindex to see both V3 and V4 data.");
    console.log("   After deployment and reindexing, both versions will be available.");
  } else {
    console.log("\n⚠️  No data found. Deploy and reindex to populate DailyPoolActivity.");
  }

  console.log("\n");
}

testUnifiedDailyActivity().catch(console.error);
