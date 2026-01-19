# Web3 Integration & Blockchain Setup Guide

**Repository:** BONDAI-MANUS-UPDATE  
**Date:** January 16, 2026  
**Status:** Ready for Implementation

---

## Overview

This guide covers the complete Web3 integration for the BondAI platform, including:
- BAI token (native cryptocurrency)
- Staking vault for token-gating
- Bond NFTs (ERC-721)
- Auction registry with on-chain bidding
- n8n-level webhook automation
- Cross-platform integration framework

---

## Part 1: Smart Contract Deployment

### Prerequisites
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install ethers @openzeppelin/contracts
```

### 1.1 Initialize Hardhat
```bash
cd /home/ubuntu/BONDAI-MANUS-UPDATE
npx hardhat init
# Choose "Create a TypeScript project"
```

### 1.2 Configure Hardhat
Create `hardhat.config.ts`:
```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    polygonMumbai: {
      url: process.env.MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
};

export default config;
```

### 1.3 Deploy Contracts
Create `scripts/deploy.ts`:
```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy BAI Token
  const BondAIToken = await ethers.getContractFactory("BondAIToken");
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  const rewardsPool = process.env.REWARDS_POOL_ADDRESS || deployer.address;
  const teamVesting = process.env.TEAM_VESTING_ADDRESS || deployer.address;
  const liquidityPool = process.env.LIQUIDITY_POOL_ADDRESS || deployer.address;

  const baiToken = await BondAIToken.deploy(
    deployer.address,
    treasury,
    rewardsPool,
    teamVesting,
    liquidityPool
  );
  await baiToken.waitForDeployment();
  console.log("BAI Token deployed to:", await baiToken.getAddress());

  // 2. Deploy Staking Vault
  const StakingVault = await ethers.getContractFactory("StakingVault");
  const stakingVault = await StakingVault.deploy(
    await baiToken.getAddress(),
    deployer.address
  );
  await stakingVault.waitForDeployment();
  console.log("Staking Vault deployed to:", await stakingVault.getAddress());

  // 3. Deploy Bond NFT
  const BondNFT = await ethers.getContractFactory("BondNFT");
  const bondNFT = await BondNFT.deploy(deployer.address);
  await bondNFT.waitForDeployment();
  console.log("Bond NFT deployed to:", await bondNFT.getAddress());

  // 4. Deploy Auction Registry
  const BondAuctionRegistry = await ethers.getContractFactory("BondAuctionRegistry");
  const minimumStake = ethers.parseEther("1000"); // 1000 BAI
  const stakePerBid = ethers.parseEther("100");   // 100 BAI
  const defaultDuration = 7 * 24 * 60 * 60;       // 7 days

  const auctionRegistry = await BondAuctionRegistry.deploy(
    await stakingVault.getAddress(),
    deployer.address,
    minimumStake,
    stakePerBid,
    defaultDuration
  );
  await auctionRegistry.waitForDeployment();
  console.log("Auction Registry deployed to:", await auctionRegistry.getAddress());

  // 5. Grant roles
  await stakingVault.grantAuctionRole(await auctionRegistry.getAddress());
  console.log("Granted AUCTION_ROLE to Auction Registry");

  // Save deployment addresses
  const deployment = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    baiToken: await baiToken.getAddress(),
    stakingVault: await stakingVault.getAddress(),
    bondNFT: await bondNFT.getAddress(),
    auctionRegistry: await auctionRegistry.getAddress(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deployment, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 1.4 Deploy to Testnet
```bash
# Set environment variables
export DEPLOYER_PRIVATE_KEY="your-private-key"
export MUMBAI_RPC_URL="https://rpc-mumbai.maticvigil.com"

# Deploy
npx hardhat run scripts/deploy.ts --network polygonMumbai

# Verify contracts
npx hardhat verify --network polygonMumbai <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

## Part 2: Database Setup

### 2.1 Run Migration
```bash
# Apply Web3 migration
psql $DATABASE_URL -f migrations/0004_add_web3_blockchain_tables.sql
```

### 2.2 Insert Smart Contract Records
```sql
-- Insert deployed contract addresses
INSERT INTO smart_contracts (contract_name, contract_type, contract_address, chain_id, abi, is_active, deployed_at)
VALUES 
  ('BondAIToken', 'token', '0x...', 80001, '[...]', true, NOW()),
  ('StakingVault', 'vault', '0x...', 80001, '[...]', true, NOW()),
  ('BondNFT', 'nft', '0x...', 80001, '[...]', true, NOW()),
  ('BondAuctionRegistry', 'auction', '0x...', 80001, '[...]', true, NOW());
```

### 2.3 Configure Token Gates
```sql
-- Insert token gate configurations
INSERT INTO token_gates (action_name, description, token_address, token_symbol, minimum_balance, chain_id, alternative_action)
VALUES 
  ('auction.bid', 'Place bids in bond auctions', '0x...', 'BAI', '1000', 80001, 'Pay $10 fee'),
  ('bond.purchase', '10% discount on bond purchases', '0x...', 'BAI', '5000', 80001, 'Full price'),
  ('analytics.premium', 'Access premium analytics', '0x...', 'BAI', '10000', 80001, '$50/month subscription'),
  ('distribution.priority', 'Priority distribution payouts', '0x...', 'BAI', '25000', 80001, 'Normal queue');
```

---

## Part 3: Backend Integration

### 3.1 Install Dependencies
```bash
npm install ethers@^6.10.0 ioredis@^5.3.2 bull@^4.12.0
npm install --save-dev @types/bull @types/ioredis
```

### 3.2 Environment Variables
Add to `.env`:
```bash
# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
ETHEREUM_RPC_URL=https://eth.llamarpc.com

# Contracts (update after deployment)
BAI_TOKEN_ADDRESS=0x...
STAKING_VAULT_ADDRESS=0x...
BOND_NFT_ADDRESS=0x...
AUCTION_REGISTRY_ADDRESS=0x...

# Redis
REDIS_URL=redis://localhost:6379
```

### 3.3 Update Routes
Add to `server/routes.ts`:
```typescript
import { web3Service } from './services/web3Service';
import { webhookService } from './services/webhookService';
import { requireTokenBalance } from './middleware/tokenGate';

// Web3 wallet routes
app.post('/api/wallet/link', authenticate, async (req, res) => {
  const { walletAddress, chainId, signature, nonce } = req.body;
  await web3Service.linkWallet(req.user.id, walletAddress, chainId, signature, nonce);
  res.json({ success: true });
});

app.get('/api/wallet/balance', authenticate, async (req, res) => {
  const { tokenAddress, chainId } = req.query;
  // Get user's primary wallet
  // Sync balance
  // Return balance
});

// Auction routes with token-gating
app.post('/api/auctions/:id/bids',
  authenticate,
  requireTokenBalance('auction.bid'),
  async (req, res) => {
    // Place bid logic
  }
);

// Webhook routes
app.post('/api/webhooks', authenticate, async (req, res) => {
  const { name, url, events } = req.body;
  const webhookId = await webhookService.registerWebhook(
    req.user.id,
    name,
    url,
    events
  );
  res.json({ webhookId });
});

app.get('/api/webhooks', authenticate, async (req, res) => {
  const webhooks = await webhookService.getUserWebhooks(req.user.id);
  res.json(webhooks);
});
```

---

## Part 4: Frontend Integration

### 4.1 Install Web3 Libraries
```bash
cd client
npm install ethers wagmi viem @rainbow-me/rainbowkit
```

### 4.2 Create Wallet Connection Component
```typescript
// client/src/components/WalletConnect.tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletConnect() {
  return <ConnectButton />;
}
```

### 4.3 Token Balance Display
```typescript
// client/src/components/TokenBalance.tsx
import { useBalance } from 'wagmi';

export function TokenBalance({ address, tokenAddress }: { address: string, tokenAddress: string }) {
  const { data, isLoading } = useBalance({
    address: address as `0x${string}`,
    token: tokenAddress as `0x${string}`,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data?.formatted} {data?.symbol}
    </div>
  );
}
```

---

## Part 5: Token-Gating Examples

### Example 1: Auction Bidding
```typescript
// Require 1000 BAI to place bids
app.post('/api/auctions/:id/bids',
  authenticate,
  requireTokenBalance('auction.bid'),
  async (req, res) => {
    // User has 1000+ BAI, allow bid
    const bid = await createBid(req.params.id, req.user.id, req.body.amount);
    res.json(bid);
  }
);
```

### Example 2: Premium Analytics with Discount
```typescript
// 10% discount if user has 10000 BAI
app.get('/api/analytics/premium',
  authenticate,
  optionalTokenDiscount('analytics.premium', 10),
  async (req, res) => {
    const basePrice = 50;
    const discount = req.tokenDiscount?.eligible ? req.tokenDiscount.percent : 0;
    const finalPrice = basePrice * (1 - discount / 100);
    
    res.json({
      price: finalPrice,
      discount: discount,
      hasDiscount: req.tokenDiscount?.eligible,
    });
  }
);
```

---

## Part 6: Webhook Integration Examples

### Example 1: Send Webhook on Bond Creation
```typescript
import { webhookService, WEBHOOK_EVENTS } from './services/webhookService';

// After creating a bond
const bond = await createBond(data);

// Trigger webhook
await webhookService.triggerEvent({
  type: WEBHOOK_EVENTS.BOND_CREATED,
  data: {
    bondId: bond.id,
    faceValue: bond.faceValue,
    maturityDate: bond.maturityDate,
  },
  timestamp: new Date(),
  entityType: 'bond',
  entityId: bond.id,
});
```

### Example 2: Receive Webhook from External Service
```typescript
app.post('/api/webhooks/receive/:userId/:webhookId', async (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const payload = JSON.stringify(req.body);
  
  // Get webhook secret
  const webhook = await getWebhook(req.params.webhookId);
  
  // Verify signature
  const isValid = webhookService.verifySignature(payload, signature, webhook.secret);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
  await processIncomingWebhook(req.body);
  
  res.json({ success: true });
});
```

---

## Part 7: Cross-Repository Integration

### 7.1 Shared Event Bus (Redis Pub/Sub)
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const publisher = redis.duplicate();

// Publish event
publisher.publish('bondai:events', JSON.stringify({
  type: 'bond.created',
  data: { bondId: 123 },
  timestamp: new Date(),
}));

// Subscribe to events
redis.subscribe('bondai:events', 'global:user:actions');

redis.on('message', (channel, message) => {
  const event = JSON.parse(message);
  console.log('Received event:', event);
  // Process event
});
```

### 7.2 API Key Authentication
```typescript
import crypto from 'crypto';

// Generate API key
function generateApiKey(): { key: string, hash: string, prefix: string } {
  const key = `bai_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 12);
  
  return { key, hash, prefix };
}

// Verify API key
app.use('/api/external/*', async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const keyRecord = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, hash),
  });
  
  if (!keyRecord || !keyRecord.isActive) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Check rate limit
  // ... rate limiting logic
  
  req.apiKey = keyRecord;
  next();
});
```

---

## Part 8: Testing

### 8.1 Test Smart Contracts
```bash
npx hardhat test
```

### 8.2 Test Token-Gating
```typescript
// tests/tokenGate.test.ts
describe('Token Gating', () => {
  it('should block access without sufficient tokens', async () => {
    const response = await request(app)
      .post('/api/auctions/1/bids')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 1000 });
    
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('TOKEN_GATE_FAILED');
  });
  
  it('should allow access with sufficient tokens', async () => {
    // Give user 1000 BAI
    await mintTokens(user.walletAddress, '1000');
    
    const response = await request(app)
      .post('/api/auctions/1/bids')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 1000 });
    
    expect(response.status).toBe(200);
  });
});
```

---

## Part 9: Deployment Checklist

### Pre-Deployment
- [ ] Deploy smart contracts to testnet
- [ ] Verify contracts on block explorer
- [ ] Run database migrations
- [ ] Configure token gates
- [ ] Test wallet connection
- [ ] Test token-gating
- [ ] Test webhooks
- [ ] Security audit smart contracts

### Production Deployment
- [ ] Deploy contracts to mainnet (Polygon recommended)
- [ ] Update environment variables
- [ ] Configure production RPC providers
- [ ] Set up monitoring (Datadog, Sentry)
- [ ] Configure Redis for production
- [ ] Set up job queue workers
- [ ] Test end-to-end flows
- [ ] Launch!

---

## Part 10: Maintenance

### Monitor
- Smart contract events
- Token balances
- Webhook deliveries
- Job queue health
- Gas prices

### Regular Tasks
- Sync token balances (hourly)
- Process expired locks (daily)
- Clean up old webhook deliveries (weekly)
- Review failed webhooks (daily)
- Monitor gas usage (daily)

---

## Support & Resources

### Documentation
- Ethers.js: https://docs.ethers.org/
- OpenZeppelin: https://docs.openzeppelin.com/
- Hardhat: https://hardhat.org/docs
- Polygon: https://docs.polygon.technology/

### Community
- Discord: [Your Discord]
- GitHub: https://github.com/ocean824/BONDAI-MANUS-UPDATE
- Docs: [Your Docs URL]

---

**Status:** Ready for implementation  
**Estimated Timeline:** 8-11 weeks  
**Next Step:** Deploy contracts to testnet
