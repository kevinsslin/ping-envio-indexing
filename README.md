# PING Token Envio Indexer

A production-ready [Envio](https://envio.dev) indexer for tracking PING token transfers and Uniswap V3 pool activity on Base network.

## 📊 What it Indexes

- **Token**: PING (`0xd85c31854c2B0Fb40aaA9E2Fc4Da23C21f829d46`)
- **Pool**: PING-USDC Uniswap V3 (`0xBc51DB8aEC659027AE0B0E468C0735418161A780`)
- **Network**: Base (Chain ID: 8453)
- **Fee Tier**: 0.30% (3000)

## ✨ Features

### Transfer Tracking
- Real-time account balance tracking
- Transfer history with pool-related detection
- Holder count (excludes zero-balance accounts)
- Daily token activity statistics
- New account tracking

### Swap Tracking
- Complete swap event records
- Pool statistics (liquidity, price, volume)
- Multi-decimal support (USDC: 6, PING: 18)
- Daily pool activity aggregation

### Data Aggregation
- Daily token metrics (transfers, volume, active users)
- Daily pool metrics (swaps, volume, liquidity changes)
- Historical trends and analytics

## 🚀 Quick Start

### Prerequisites

- [Node.js (v18 or newer)](https://nodejs.org/en/download/current)
- [pnpm (v8 or newer)](https://pnpm.io/installation)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Installation

```bash
# Install dependencies
pnpm install

# Generate types from config
pnpm codegen
```

### Development

```bash
# Start local indexer with Hasura
pnpm dev
```

Visit http://localhost:8080 to access the GraphQL Playground (password: `testing`)

## 📝 Example Queries

### Get Token Statistics

```graphql
query GetToken {
  Token(id: "8453_0xd85c31854c2b0fb40aaa9e2fc4da23c21f829d46") {
    symbol
    name
    totalTransfers
    totalVolume
    holderCount
  }
}
```

### Get Latest Swaps

```graphql
query LatestSwaps {
  Swap(limit: 10, order_by: { timestamp: desc }) {
    timestamp
    sender
    recipient
    amount0
    amount1
    transactionHash
  }
}
```

### Get Account Balance

```graphql
query GetAccount($address: String!) {
  Account(id: $address) {
    balance
    totalSent
    totalReceived
    transferCount
  }
}
```

### Get Daily Activity

```graphql
query DailyActivity {
  DailyTokenActivity(limit: 30, order_by: { date: desc }) {
    date
    dailyTransfers
    dailyVolume
    dailyActiveAccounts
  }
}
```

More examples in `CONFIGURATION.md`

## 🛠 Utility Scripts

```bash
# Query pool information
pnpm tsx scripts/query-pool-info.ts

# Query token information
node scripts/query-token-info.js

# Run test queries
node scripts/test-queries.js
```

## 📁 Project Structure

```
├── config.yaml              # Envio configuration
├── schema.graphql           # GraphQL schema
├── src/
│   ├── EventHandlers.ts     # Event handler registration
│   ├── handlers/
│   │   ├── transfer-handler.ts
│   │   └── swap-handler.ts
│   └── utils/
│       ├── constants.ts     # Token/pool constants
│       └── index.ts         # Helper functions
└── scripts/                 # Utility scripts
```

## 🌐 Deployment

Deploy to Envio Hosted Service:

```bash
pnpm envio deploy
```

## 🔧 Configuration

To adapt this indexer for other tokens/pools, update:

1. **Token metadata** in `src/utils/constants.ts`
2. **Pool configuration** in `src/handlers/swap-handler.ts`
3. **Start block** in `config.yaml` for faster syncing

See `CONFIGURATION.md` for detailed instructions.

## 📄 License

This project is licensed under the MIT License.
