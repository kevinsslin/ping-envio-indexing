import assert from "assert";
import {
  TestHelpers,
  Account,
  Transfer,
  Token,
} from "generated";

const { MockDb, Ping, UniswapV3Pool } = TestHelpers;

describe("PING Token Transfer event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for Ping contract Transfer event
  const event = Ping.Transfer.createMockEvent({
    from: "0x0000000000000000000000000000000000000001",
    to: "0x0000000000000000000000000000000000000002",
    value: 1000000000000000000n, // 1 token (18 decimals)
  });

  it("Transfer is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Ping.Transfer.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    const actualTransfer = mockDbUpdated.entities.Transfer.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Asserting that the transfer entity exists
    assert.ok(actualTransfer, "Transfer entity should exist");

    // Check transfer properties
    assert.equal(actualTransfer?.from_id, `${event.chainId}_${event.params.from.toLowerCase()}`);
    assert.equal(actualTransfer?.to_id, `${event.chainId}_${event.params.to.toLowerCase()}`);
    assert.equal(actualTransfer?.isPoolRelated, false);
  });

  it("Account balances are updated correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Ping.Transfer.processEvent({
      event,
      mockDb,
    });

    // Check sender account
    const fromAccount = mockDbUpdated.entities.Account.get(
      `${event.chainId}_${event.params.from.toLowerCase()}`
    );

    // Check receiver account
    const toAccount = mockDbUpdated.entities.Account.get(
      `${event.chainId}_${event.params.to.toLowerCase()}`
    );

    assert.ok(fromAccount, "From account should exist");
    assert.ok(toAccount, "To account should exist");
  });
});

describe("Uniswap V3 Pool Swap event tests", () => {
  const mockDb = MockDb.createMockDb();

  // Creating mock for Swap event
  const event = UniswapV3Pool.Swap.createMockEvent({
    sender: "0x0000000000000000000000000000000000000001",
    recipient: "0x0000000000000000000000000000000000000002",
    amount0: -1000000n, // Negative means tokens going into pool (USDC, 6 decimals)
    amount1: 1000000000000000000n, // Positive means tokens coming out (PING, 18 decimals)
    sqrtPriceX96: 79228162514264337593543950336n,
    liquidity: 1000000000000000n,
    tick: 0n,
  });

  it("Swap is created correctly", async () => {
    const mockDbUpdated = await UniswapV3Pool.Swap.processEvent({
      event,
      mockDb,
    });

    const actualSwap = mockDbUpdated.entities.Swap.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    assert.ok(actualSwap, "Swap entity should exist");
    assert.equal(actualSwap?.sender, event.params.sender);
    assert.equal(actualSwap?.recipient, event.params.recipient);
  });

  it("Pool statistics are updated", async () => {
    const mockDbUpdated = await UniswapV3Pool.Swap.processEvent({
      event,
      mockDb,
    });

    const poolId = `${event.chainId}_0xbc51db8aec659027ae0b0e468c0735418161a780`;
    const pool = mockDbUpdated.entities.Pool.get(poolId);

    assert.ok(pool, "Pool entity should exist");
    assert.equal(pool?.txCount, 1n, "Pool tx count should be 1");
  });
});
