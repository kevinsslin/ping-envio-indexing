/**
 * Transfer event handler
 * Tracks token transfers, account balances, buy/sell activity, and daily metrics
 */
import { Ping, Account, Transfer, Token, DailyTokenActivity, Pool } from "generated";
import {
  PING_TOKEN_ADDRESS,
  TOKEN_DECIMALS,
  TOKEN_NAME,
  TOKEN_SYMBOL,
  ZERO_BI,
  ZERO_BD,
  ONE_BI,
  POOL_RELATION_BUY,
  POOL_RELATION_SELL,
  POOL_RELATION_NONE,
  ADDRESS_ZERO,
} from "../utils/constants";
import {
  convertTokenToDecimal,
  getDayId,
  getDayStartTimestamp,
  normalizeAddress,
} from "../utils/index";

Ping.Transfer.handler(async ({ event, context }) => {
  const chainId = BigInt(event.chainId);
  const tokenId = `${chainId}_${normalizeAddress(PING_TOKEN_ADDRESS)}`;
  const fromAddress = normalizeAddress(event.params.from);
  const toAddress = normalizeAddress(event.params.to);

  // Load entities in parallel for better performance
  const [token, fromAccount, toAccount, dailyActivity] = await Promise.all([
    context.Token.get(tokenId),
    context.Account.get(`${chainId}_${fromAddress}`),
    context.Account.get(`${chainId}_${toAddress}`),
    context.DailyTokenActivity.get(
      `${chainId}_${getDayId(BigInt(event.block.timestamp))}`
    ),
  ]);

  // Skip the actual processing during preload phase
  if (context.isPreload) {
    return;
  }

  // Convert transfer value to decimal
  const transferValue = convertTokenToDecimal(event.params.value, TOKEN_DECIMALS);

  // Check if this transfer is pool-related by querying all pools
  // We need to check if from or to address is a known pool
  let relatedPool: Pool | undefined;
  let isPoolRelated = false;
  let poolRelatedType = POOL_RELATION_NONE;

  // Check if fromAddress is a pool
  const fromPool = await context.Pool.get(`${chainId}_${fromAddress}`);
  if (fromPool) {
    relatedPool = fromPool;
    isPoolRelated = true;
    poolRelatedType = POOL_RELATION_BUY; // User is buying from pool
  }

  // Check if toAddress is a pool
  const toPool = await context.Pool.get(`${chainId}_${toAddress}`);
  if (toPool) {
    relatedPool = toPool;
    isPoolRelated = true;
    poolRelatedType = POOL_RELATION_SELL; // User is selling to pool
  }

  // Track holder count changes based on balance transitions
  let holderCountDelta = 0;

  // Check sender balance change (if not zero address or pool)
  if (fromAddress !== ADDRESS_ZERO && !fromPool && fromAccount) {
    const oldBalance = fromAccount.balance;
    const newBalance = oldBalance.minus(transferValue);

    // If balance goes from positive to zero, decrement holder count
    if (oldBalance.gt(ZERO_BD) && newBalance.lte(ZERO_BD)) {
      holderCountDelta -= 1;
    }
  }

  // Check receiver balance change (if not zero address or pool)
  if (toAddress !== ADDRESS_ZERO && !toPool) {
    const oldBalance = toAccount?.balance || ZERO_BD;
    const newBalance = oldBalance.plus(transferValue);

    // If balance goes from zero to positive, increment holder count
    if (oldBalance.lte(ZERO_BD) && newBalance.gt(ZERO_BD)) {
      holderCountDelta += 1;
    }
  }

  // Track if this created a new account (for daily statistics)
  const isNewAccount = !toAccount && toAddress !== ADDRESS_ZERO && !toPool;

  // Initialize or update Token entity
  const tokenEntity: Token = token
    ? {
        ...token,
        totalTransfers: token.totalTransfers + ONE_BI,
        totalVolume: token.totalVolume.plus(transferValue),
        holderCount: BigInt(Number(token.holderCount) + holderCountDelta),
      }
    : {
        id: tokenId,
        chainId,
        address: PING_TOKEN_ADDRESS,
        symbol: TOKEN_SYMBOL,
        name: TOKEN_NAME,
        decimals: TOKEN_DECIMALS,
        totalSupply: ZERO_BI,
        totalTransfers: ONE_BI,
        totalVolume: transferValue,
        holderCount: holderCountDelta > 0 ? BigInt(holderCountDelta) : ZERO_BI,
      };

  const txHash = event.transaction.hash;
  const timestamp = BigInt(event.block.timestamp);

  // Update sender account (if not zero address and not a pool)
  if (fromAddress !== ADDRESS_ZERO && !fromPool) {
    const updatedFromAccount: Account = fromAccount
      ? {
          ...fromAccount,
          balance: fromAccount.balance.minus(transferValue),
          totalSent: fromAccount.totalSent.plus(transferValue),
          transferCount: fromAccount.transferCount + ONE_BI,
          lastTransferAt: timestamp,
          lastTransferHash: txHash,
          // Update sell tracking if sending to pool
          lastSellAt: poolRelatedType === POOL_RELATION_SELL ? timestamp : fromAccount.lastSellAt,
          lastSellHash: poolRelatedType === POOL_RELATION_SELL ? txHash : fromAccount.lastSellHash,
          totalSells: poolRelatedType === POOL_RELATION_SELL ? fromAccount.totalSells + ONE_BI : fromAccount.totalSells,
          totalSellVolume: poolRelatedType === POOL_RELATION_SELL ? fromAccount.totalSellVolume.plus(transferValue) : fromAccount.totalSellVolume,
          // Keep buy fields unchanged
          lastBuyAt: fromAccount.lastBuyAt,
          lastBuyHash: fromAccount.lastBuyHash,
          totalBuys: fromAccount.totalBuys,
          totalBuyVolume: fromAccount.totalBuyVolume,
        }
      : {
          id: `${chainId}_${fromAddress}`,
          chainId,
          address: fromAddress,
          balance: ZERO_BD.minus(transferValue),
          totalSent: transferValue,
          totalReceived: ZERO_BD,
          transferCount: ONE_BI,
          firstTransferAt: timestamp,
          lastTransferAt: timestamp,
          lastTransferHash: txHash,
          // Initialize buy/sell fields
          lastBuyAt: undefined,
          lastBuyHash: undefined,
          lastSellAt: poolRelatedType === POOL_RELATION_SELL ? timestamp : undefined,
          lastSellHash: poolRelatedType === POOL_RELATION_SELL ? txHash : undefined,
          totalBuys: ZERO_BI,
          totalSells: poolRelatedType === POOL_RELATION_SELL ? ONE_BI : ZERO_BI,
          totalBuyVolume: ZERO_BD,
          totalSellVolume: poolRelatedType === POOL_RELATION_SELL ? transferValue : ZERO_BD,
        };

    context.Account.set(updatedFromAccount);
  }

  // Update receiver account (if not zero address and not a pool)
  if (toAddress !== ADDRESS_ZERO && !toPool) {
    const updatedToAccount: Account = toAccount
      ? {
          ...toAccount,
          balance: toAccount.balance.plus(transferValue),
          totalReceived: toAccount.totalReceived.plus(transferValue),
          transferCount: toAccount.transferCount + ONE_BI,
          lastTransferAt: timestamp,
          lastTransferHash: txHash,
          // Update buy tracking if receiving from pool
          lastBuyAt: poolRelatedType === POOL_RELATION_BUY ? timestamp : toAccount.lastBuyAt,
          lastBuyHash: poolRelatedType === POOL_RELATION_BUY ? txHash : toAccount.lastBuyHash,
          totalBuys: poolRelatedType === POOL_RELATION_BUY ? toAccount.totalBuys + ONE_BI : toAccount.totalBuys,
          totalBuyVolume: poolRelatedType === POOL_RELATION_BUY ? toAccount.totalBuyVolume.plus(transferValue) : toAccount.totalBuyVolume,
          // Keep sell fields unchanged
          lastSellAt: toAccount.lastSellAt,
          lastSellHash: toAccount.lastSellHash,
          totalSells: toAccount.totalSells,
          totalSellVolume: toAccount.totalSellVolume,
        }
      : {
          id: `${chainId}_${toAddress}`,
          chainId,
          address: toAddress,
          balance: transferValue,
          totalSent: ZERO_BD,
          totalReceived: transferValue,
          transferCount: ONE_BI,
          firstTransferAt: timestamp,
          lastTransferAt: timestamp,
          lastTransferHash: txHash,
          // Initialize buy/sell fields
          lastBuyAt: poolRelatedType === POOL_RELATION_BUY ? timestamp : undefined,
          lastBuyHash: poolRelatedType === POOL_RELATION_BUY ? txHash : undefined,
          lastSellAt: undefined,
          lastSellHash: undefined,
          totalBuys: poolRelatedType === POOL_RELATION_BUY ? ONE_BI : ZERO_BI,
          totalSells: ZERO_BI,
          totalBuyVolume: poolRelatedType === POOL_RELATION_BUY ? transferValue : ZERO_BD,
          totalSellVolume: ZERO_BD,
        };

    context.Account.set(updatedToAccount);
  }

  // Create Transfer record
  const transferEntity: Transfer = {
    id: `${chainId}_${event.block.number}_${event.logIndex}`,
    chainId,
    transactionHash: txHash,
    timestamp,
    blockNumber: BigInt(event.block.number),
    logIndex: BigInt(event.logIndex),
    from_id: `${chainId}_${fromAddress}`,
    to_id: `${chainId}_${toAddress}`,
    value: transferValue,
    isPoolRelated,
    poolRelatedType,
    relatedPool_id: relatedPool ? relatedPool.id : undefined,
  };

  // Update or create DailyTokenActivity
  const dayId = getDayId(timestamp);
  const dayStartTimestamp = getDayStartTimestamp(timestamp);

  const updatedDailyActivity: DailyTokenActivity = dailyActivity
    ? {
        ...dailyActivity,
        dailyTransfers: dailyActivity.dailyTransfers + ONE_BI,
        dailyVolume: dailyActivity.dailyVolume.plus(transferValue),
        dailyActiveAccounts: dailyActivity.dailyActiveAccounts,
        newAccounts: isNewAccount
          ? dailyActivity.newAccounts + ONE_BI
          : dailyActivity.newAccounts,
      }
    : {
        id: `${chainId}_${dayId}`,
        chainId,
        date: dayId,
        timestamp: dayStartTimestamp,
        dailyTransfers: ONE_BI,
        dailyVolume: transferValue,
        dailyActiveAccounts: ONE_BI,
        newAccounts: isNewAccount ? ONE_BI : ZERO_BI,
      };

  // Save all entities
  context.Token.set(tokenEntity);
  context.Transfer.set(transferEntity);
  context.DailyTokenActivity.set(updatedDailyActivity);
});
