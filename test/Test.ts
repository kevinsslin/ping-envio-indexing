import assert from "assert";
import { 
  TestHelpers,
  Ping_Approval
} from "generated";
const { MockDb, Ping } = TestHelpers;

describe("Ping contract Approval event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for Ping contract Approval event
  const event = Ping.Approval.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("Ping_Approval is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Ping.Approval.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualPingApproval = mockDbUpdated.entities.Ping_Approval.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedPingApproval: Ping_Approval = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner: event.params.owner,
      spender: event.params.spender,
      value: event.params.value,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualPingApproval, expectedPingApproval, "Actual PingApproval should be the same as the expectedPingApproval");
  });
});
