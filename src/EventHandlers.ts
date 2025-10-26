/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  Ping,
  Ping_Approval,
  Ping_AuthorizationCanceled,
  Ping_AuthorizationUsed,
  Ping_EIP712DomainChanged,
  Ping_FeesCollected,
  Ping_LiquidityDeployed,
  Ping_OwnershipTransferred,
  Ping_RoleAdminChanged,
  Ping_RoleGranted,
  Ping_RoleRevoked,
  Ping_Transfer,
  UniswapV3Pool,
  UniswapV3Pool_Burn,
  UniswapV3Pool_Collect,
  UniswapV3Pool_CollectProtocol,
  UniswapV3Pool_Flash,
  UniswapV3Pool_IncreaseObservationCardinalityNext,
  UniswapV3Pool_Initialize,
  UniswapV3Pool_Mint,
  UniswapV3Pool_SetFeeProtocol,
  UniswapV3Pool_Swap,
} from "generated";

Ping.Approval.handler(async ({ event, context }) => {
  const entity: Ping_Approval = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    owner: event.params.owner,
    spender: event.params.spender,
    value: event.params.value,
  };

  context.Ping_Approval.set(entity);
});

Ping.AuthorizationCanceled.handler(async ({ event, context }) => {
  const entity: Ping_AuthorizationCanceled = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    authorizer: event.params.authorizer,
    nonce: event.params.nonce,
  };

  context.Ping_AuthorizationCanceled.set(entity);
});

Ping.AuthorizationUsed.handler(async ({ event, context }) => {
  const entity: Ping_AuthorizationUsed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    authorizer: event.params.authorizer,
    nonce: event.params.nonce,
  };

  context.Ping_AuthorizationUsed.set(entity);
});

Ping.EIP712DomainChanged.handler(async ({ event, context }) => {
  const entity: Ping_EIP712DomainChanged = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
  };

  context.Ping_EIP712DomainChanged.set(entity);
});

Ping.FeesCollected.handler(async ({ event, context }) => {
  const entity: Ping_FeesCollected = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    recipient: event.params.recipient,
    amountToken0: event.params.amountToken0,
    amountToken1: event.params.amountToken1,
  };

  context.Ping_FeesCollected.set(entity);
});

Ping.LiquidityDeployed.handler(async ({ event, context }) => {
  const entity: Ping_LiquidityDeployed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    tokenId: event.params.tokenId,
    liquidity: event.params.liquidity,
  };

  context.Ping_LiquidityDeployed.set(entity);
});

Ping.OwnershipTransferred.handler(async ({ event, context }) => {
  const entity: Ping_OwnershipTransferred = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    previousOwner: event.params.previousOwner,
    newOwner: event.params.newOwner,
  };

  context.Ping_OwnershipTransferred.set(entity);
});

Ping.RoleAdminChanged.handler(async ({ event, context }) => {
  const entity: Ping_RoleAdminChanged = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    role: event.params.role,
    previousAdminRole: event.params.previousAdminRole,
    newAdminRole: event.params.newAdminRole,
  };

  context.Ping_RoleAdminChanged.set(entity);
});

Ping.RoleGranted.handler(async ({ event, context }) => {
  const entity: Ping_RoleGranted = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    role: event.params.role,
    account: event.params.account,
    sender: event.params.sender,
  };

  context.Ping_RoleGranted.set(entity);
});

Ping.RoleRevoked.handler(async ({ event, context }) => {
  const entity: Ping_RoleRevoked = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    role: event.params.role,
    account: event.params.account,
    sender: event.params.sender,
  };

  context.Ping_RoleRevoked.set(entity);
});

Ping.Transfer.handler(async ({ event, context }) => {
  const entity: Ping_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    value: event.params.value,
  };

  context.Ping_Transfer.set(entity);
});

UniswapV3Pool.Burn.handler(async ({ event, context }) => {
  const entity: UniswapV3Pool_Burn = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    owner: event.params.owner,
    tickLower: event.params.tickLower,
    tickUpper: event.params.tickUpper,
    amount: event.params.amount,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
  };

  context.UniswapV3Pool_Burn.set(entity);
});

UniswapV3Pool.Collect.handler(async ({ event, context }) => {
  const entity: UniswapV3Pool_Collect = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    owner: event.params.owner,
    recipient: event.params.recipient,
    tickLower: event.params.tickLower,
    tickUpper: event.params.tickUpper,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
  };

  context.UniswapV3Pool_Collect.set(entity);
});

UniswapV3Pool.CollectProtocol.handler(async ({ event, context }) => {
  const entity: UniswapV3Pool_CollectProtocol = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    sender: event.params.sender,
    recipient: event.params.recipient,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
  };

  context.UniswapV3Pool_CollectProtocol.set(entity);
});

UniswapV3Pool.Flash.handler(async ({ event, context }) => {
  const entity: UniswapV3Pool_Flash = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    sender: event.params.sender,
    recipient: event.params.recipient,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
    paid0: event.params.paid0,
    paid1: event.params.paid1,
  };

  context.UniswapV3Pool_Flash.set(entity);
});

UniswapV3Pool.IncreaseObservationCardinalityNext.handler(async ({ event, context }) => {
  const entity: UniswapV3Pool_IncreaseObservationCardinalityNext = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    observationCardinalityNextOld: event.params.observationCardinalityNextOld,
    observationCardinalityNextNew: event.params.observationCardinalityNextNew,
  };

  context.UniswapV3Pool_IncreaseObservationCardinalityNext.set(entity);
});

UniswapV3Pool.Initialize.handler(async ({ event, context }) => {
  const entity: UniswapV3Pool_Initialize = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    sqrtPriceX96: event.params.sqrtPriceX96,
    tick: event.params.tick,
  };

  context.UniswapV3Pool_Initialize.set(entity);
});

UniswapV3Pool.Mint.handler(async ({ event, context }) => {
  const entity: UniswapV3Pool_Mint = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    sender: event.params.sender,
    owner: event.params.owner,
    tickLower: event.params.tickLower,
    tickUpper: event.params.tickUpper,
    amount: event.params.amount,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
  };

  context.UniswapV3Pool_Mint.set(entity);
});

UniswapV3Pool.SetFeeProtocol.handler(async ({ event, context }) => {
  const entity: UniswapV3Pool_SetFeeProtocol = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    feeProtocol0Old: event.params.feeProtocol0Old,
    feeProtocol1Old: event.params.feeProtocol1Old,
    feeProtocol0New: event.params.feeProtocol0New,
    feeProtocol1New: event.params.feeProtocol1New,
  };

  context.UniswapV3Pool_SetFeeProtocol.set(entity);
});

UniswapV3Pool.Swap.handler(async ({ event, context }) => {
  const entity: UniswapV3Pool_Swap = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    sender: event.params.sender,
    recipient: event.params.recipient,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
    sqrtPriceX96: event.params.sqrtPriceX96,
    liquidity: event.params.liquidity,
    tick: event.params.tick,
  };

  context.UniswapV3Pool_Swap.set(entity);
});
