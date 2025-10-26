/**
 * Transfer event handler
 * Tracks token transfers, account balances, and daily activity
 */
import { Ping, Account, Transfer, Token, DailyTokenActivity } from "generated";
import {
  POOL_ADDRESS,
  TOKEN_ADDRESS,
  TOKEN_DECIMALS,
  TOKEN_NAME,
  TOKEN_SYMBOL,
  ZERO_BI,
  ZERO_BD,
  ONE_BI,
  POOL_RELATION_FROM,
  POOL_RELATION_TO,
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
  const tokenId = `${chainId}_${normalizeAddress(TOKEN_ADDRESS)}`;
  const fromAddress = normalizeAddress(event.params.from);
  const toAddress = normalizeAddress(event.params.to);
  const poolAddress = normalizeAddress(POOL_ADDRESS);

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
  // This is for optimization - we only load entities during preload
  if (context.isPreload) {
    return;
  }

  // Convert transfer value to decimal
  const transferValue = convertTokenToDecimal(event.params.value, TOKEN_DECIMALS);

  // Check if this transfer is pool-related
  const isPoolRelated = fromAddress === poolAddress || toAddress === poolAddress;
  let poolRelatedType = POOL_RELATION_NONE;
  if (fromAddress === poolAddress) {
    poolRelatedType = POOL_RELATION_FROM;
  } else if (toAddress === poolAddress) {
    poolRelatedType = POOL_RELATION_TO;
  }

  // Track holder count changes based on balance transitions
  // We increment when an account goes from 0 balance to positive
  // We decrement when an account goes from positive balance to 0
  let holderCountDelta = 0;

  // Check sender balance change (if not zero address or pool)
  if (fromAddress !== ADDRESS_ZERO && fromAddress !== poolAddress && fromAccount) {
    const oldBalance = fromAccount.balance;
    const newBalance = oldBalance.minus(transferValue);

    // If balance goes from positive to zero, decrement holder count
    if (oldBalance.gt(ZERO_BD) && newBalance.lte(ZERO_BD)) {
      holderCountDelta -= 1;
    }
  }

  // Check receiver balance change (if not zero address or pool)
  if (toAddress !== ADDRESS_ZERO && toAddress !== poolAddress) {
    const oldBalance = toAccount?.balance || ZERO_BD;
    const newBalance = oldBalance.plus(transferValue);

    // If balance goes from zero to positive, increment holder count
    if (oldBalance.lte(ZERO_BD) && newBalance.gt(ZERO_BD)) {
      holderCountDelta += 1;
    }
  }

  // Track if this created a new account (for daily statistics)
  const isNewAccount = !toAccount && toAddress !== ADDRESS_ZERO && toAddress !== poolAddress;

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
        address: TOKEN_ADDRESS,
        symbol: TOKEN_SYMBOL,
        name: TOKEN_NAME,
        decimals: TOKEN_DECIMALS,
        totalSupply: ZERO_BI, // This should be updated from token contract if needed
        totalTransfers: ONE_BI,
        totalVolume: transferValue,
        holderCount: holderCountDelta > 0 ? BigInt(holderCountDelta) : ZERO_BI,
      };

  // Update sender account (if not zero address)
  if (fromAddress !== ADDRESS_ZERO) {
    const updatedFromAccount: Account = fromAccount
      ? {
          ...fromAccount,
          balance: fromAccount.balance.minus(transferValue),
          totalSent: fromAccount.totalSent.plus(transferValue),
          transferCount: fromAccount.transferCount + ONE_BI,
          lastTransferAt: BigInt(event.block.timestamp),
        }
      : {
          id: `${chainId}_${fromAddress}`,
          chainId,
          address: fromAddress,
          balance: ZERO_BD.minus(transferValue), // Negative balance for first transfer (should not happen in practice)
          totalSent: transferValue,
          totalReceived: ZERO_BD,
          transferCount: ONE_BI,
          firstTransferAt: BigInt(event.block.timestamp),
          lastTransferAt: BigInt(event.block.timestamp),
        };

    context.Account.set(updatedFromAccount);
  }

  // Update receiver account (if not zero address)
  if (toAddress !== ADDRESS_ZERO) {
    const updatedToAccount: Account = toAccount
      ? {
          ...toAccount,
          balance: toAccount.balance.plus(transferValue),
          totalReceived: toAccount.totalReceived.plus(transferValue),
          transferCount: toAccount.transferCount + ONE_BI,
          lastTransferAt: BigInt(event.block.timestamp),
        }
      : {
          id: `${chainId}_${toAddress}`,
          chainId,
          address: toAddress,
          balance: transferValue,
          totalSent: ZERO_BD,
          totalReceived: transferValue,
          transferCount: ONE_BI,
          firstTransferAt: BigInt(event.block.timestamp),
          lastTransferAt: BigInt(event.block.timestamp),
        };

    context.Account.set(updatedToAccount);
  }

  // Create Transfer record
  const transferEntity: Transfer = {
    id: `${chainId}_${event.block.number}_${event.logIndex}`,
    chainId,
    transactionHash: event.transaction.hash,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    logIndex: BigInt(event.logIndex),
    from_id: `${chainId}_${fromAddress}`,
    to_id: `${chainId}_${toAddress}`,
    value: transferValue,
    isPoolRelated,
    poolRelatedType,
  };

  // Update or create DailyTokenActivity
  const dayId = getDayId(BigInt(event.block.timestamp));
  const dayStartTimestamp = getDayStartTimestamp(BigInt(event.block.timestamp));

  const updatedDailyActivity: DailyTokenActivity = dailyActivity
    ? {
        ...dailyActivity,
        dailyTransfers: dailyActivity.dailyTransfers + ONE_BI,
        dailyVolume: dailyActivity.dailyVolume.plus(transferValue),
        dailyActiveAccounts: dailyActivity.dailyActiveAccounts, // This is a simplification - would need to track unique addresses
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
        dailyActiveAccounts: ONE_BI, // Simplified - would need proper tracking
        newAccounts: isNewAccount ? ONE_BI : ZERO_BI,
      };

  // Save all entities
  context.Token.set(tokenEntity);
  context.Transfer.set(transferEntity);
  context.DailyTokenActivity.set(updatedDailyActivity);
});
