# Envio Indexer 配置指南

這個 indexer 追蹤代幣 Transfer 和 Uniswap V3 Pool Swap 事件，包含用戶餘額追蹤、每日活動統計等功能。

## 📝 需要配置的地方

### 1. src/utils/constants.ts

更新以下常數以匹配您的代幣：

```typescript
// 代幣 metadata（需要根據實際代幣更新）
export const TOKEN_SYMBOL = "PING"; // 更新為實際的代幣符號
export const TOKEN_NAME = "Ping Token"; // 更新為實際的代幣名稱
export const TOKEN_DECIMALS = 18n; // 更新為實際的 decimals（通常是 18）
```

### 2. src/handlers/swap-handler.ts

更新 Pool 配置：

```typescript
// 第 20-23 行：更新 token addresses
const TOKEN0_ADDRESS = TOKEN_ADDRESS; // 如果 PING 是 token0
const TOKEN1_ADDRESS = "0x..."; // 更新為 pool 中的另一個代幣地址（例如 WETH 或 USDC）

// 第 24-25 行：更新 token decimals
const TOKEN0_DECIMALS = TOKEN_DECIMALS;
const TOKEN1_DECIMALS = 18n; // 更新為 token1 的實際 decimals

// 第 29 行：更新 fee tier
const FEE_TIER = 3000n; // 3000 = 0.3%, 500 = 0.05%, 10000 = 1%
```

### 如何查詢 Pool 資訊

您可以使用以下方法獲取 Pool 的 token0, token1, fee 等資訊：

1. **使用 Etherscan/Basescan**：
   - 前往 Pool 合約頁面：https://basescan.org/address/0xBc51DB8aEC659027AE0B0E468C0735418161A780
   - 在 "Read Contract" 標籤中查詢 `token0()`, `token1()`, `fee()`

2. **使用 viem 或 ethers**：
   ```typescript
   const pool = getContract({
     address: '0xBc51DB8aEC659027AE0B0E468C0735418161A780',
     abi: uniswapV3PoolAbi,
   })
   const token0 = await pool.read.token0()
   const token1 = await pool.read.token1()
   const fee = await pool.read.fee()
   ```

## 🚀 運行 Indexer

### 開發模式

```bash
# 1. 確保配置正確
# 2. 運行 codegen（如果修改了 schema 或 config）
pnpm codegen

# 3. 啟動開發模式
pnpm dev
```

### 部署到 Hosted Service

```bash
# 部署到 Envio Hosted Service
pnpm envio deploy
```

## 📊 可查詢的數據

### 1. Token 總體統計

```graphql
query GetToken {
  Token(id: "8453_0xd85c31854c2b0fb40aaa9e2fc4da23c21f829d46") {
    symbol
    name
    decimals
    totalTransfers
    totalVolume
    holderCount
  }
}
```

### 2. 用戶餘額和活動

```graphql
query GetAccount {
  Account(id: "8453_0x...") {
    address
    balance
    totalSent
    totalReceived
    transferCount
    firstTransferAt
    lastTransferAt
  }
}
```

### 3. Transfer 歷史

```graphql
query GetTransfers {
  Transfer(
    limit: 10
    order_by: { timestamp: desc }
    where: { isPoolRelated: { _eq: true } }
  ) {
    id
    timestamp
    from { address balance }
    to { address balance }
    value
    isPoolRelated
    poolRelatedType
    transactionHash
  }
}
```

### 4. Pool 統計

```graphql
query GetPool {
  Pool(id: "8453_0xbc51db8aec659027ae0b0e468c0735418161a780") {
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
  }
}
```

### 5. Swap 歷史

```graphql
query GetSwaps {
  Swap(
    limit: 10
    order_by: { timestamp: desc }
  ) {
    id
    timestamp
    sender
    recipient
    amount0
    amount1
    sqrtPriceX96
    tick
    transactionHash
    pool {
      address
      token0
      token1
    }
  }
}
```

### 6. 每日代幣活動

```graphql
query GetDailyTokenActivity {
  DailyTokenActivity(
    limit: 30
    order_by: { date: desc }
  ) {
    date
    dailyTransfers
    dailyVolume
    dailyActiveAccounts
    newAccounts
  }
}
```

### 7. 每日 Pool 活動

```graphql
query GetDailyPoolActivity {
  DailyPoolActivity(
    limit: 30
    order_by: { date: desc }
    where: { pool: { _eq: "0xbc51db8aec659027ae0b0e468c0735418161a780" } }
  ) {
    date
    dailySwaps
    dailyVolumeToken0
    dailyVolumeToken1
    liquidityStart
    liquidityEnd
  }
}
```

## 🔧 進階功能

### 辨別 Pool 相關的 Transfer

Transfer entity 有兩個字段用於辨別是否與 Pool 相關：

- `isPoolRelated`: Boolean - true 表示 from 或 to 是 Pool 地址
- `poolRelatedType`: String - "FROM_POOL", "TO_POOL", or "NONE"

這可以幫助您：
- 追蹤流入/流出 Pool 的代幣
- 分析 LP 操作（添加/移除流動性）
- 區分普通轉帳和 Pool 相關操作

### 時間序列分析

使用 DailyTokenActivity 和 DailyPoolActivity 可以：
- 分析每日交易量趨勢
- 追蹤活躍用戶數變化
- 監控 Pool 流動性變化

## 📌 注意事項

1. **Token Metadata**: 確保在 constants.ts 中正確設置 symbol, name, decimals
2. **Pool Configuration**: 必須在 swap-handler.ts 中正確設置 token0, token1, decimals, fee
3. **ChainId**: 當前配置為 Base (8453)，如需支援其他鏈請修改 config.yaml
4. **Start Block**: config.yaml 中的 start_block 設為 0，建議改為代幣/Pool 的部署區塊以提升同步速度

## 🐛 常見問題

### Q: codegen 失敗怎麼辦？
A: 檢查 schema.graphql 語法是否正確，確保所有 type 定義完整

### Q: handler 報錯怎麼辦？
A: 先執行 `pnpm codegen` 確保 types 是最新的

### Q: 如何加速同步？
A: 在 config.yaml 中將 start_block 設為代幣或 Pool 的實際部署區塊號

### Q: 如何添加其他事件處理？
A:
1. 在 src/handlers/ 創建新的 handler 檔案
2. 在 src/EventHandlers.ts 中 import 該檔案
3. 執行 `pnpm codegen`

## 📚 參考資源

- [Envio Documentation](https://docs.envio.dev)
- [Uniswap V4 Indexer Reference](https://github.com/enviodev/uniswap-v4-indexer)
- [GraphQL Query Guide](https://docs.envio.dev/docs/HyperIndex/guides/navigating-hasura)
