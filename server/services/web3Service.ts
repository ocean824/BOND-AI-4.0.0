import { ethers } from 'ethers';
import { db } from '../db';
import { 
  web3Wallets, 
  tokenBalances, 
  blockchainTransactions,
  smartContracts 
} from '@shared/schema-web3';
import { eq, and } from 'drizzle-orm';

// Chain configurations
export const SUPPORTED_CHAINS = {
  POLYGON_MAINNET: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorer: 'https://polygonscan.com',
  },
  POLYGON_MUMBAI: {
    chainId: 80001,
    name: 'Polygon Mumbai',
    rpcUrl: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorer: 'https://mumbai.polygonscan.com',
  },
  ETHEREUM_MAINNET: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://etherscan.io',
  },
};

// Default to Polygon for low fees
const DEFAULT_CHAIN = SUPPORTED_CHAINS.POLYGON_MAINNET;

export class Web3Service {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();
  private contracts: Map<string, ethers.Contract> = new Map();

  constructor() {
    // Initialize providers for all supported chains
    Object.values(SUPPORTED_CHAINS).forEach(chain => {
      this.providers.set(
        chain.chainId,
        new ethers.JsonRpcProvider(chain.rpcUrl)
      );
    });
  }

  /**
   * Get provider for a specific chain
   */
  getProvider(chainId: number = DEFAULT_CHAIN.chainId): ethers.JsonRpcProvider {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`Provider not found for chain ${chainId}`);
    }
    return provider;
  }

  /**
   * Get contract instance
   */
  async getContract(contractType: string, chainId: number = DEFAULT_CHAIN.chainId): Promise<ethers.Contract> {
    const key = `${contractType}-${chainId}`;
    
    if (this.contracts.has(key)) {
      return this.contracts.get(key)!;
    }

    // Load contract from database
    const [contractData] = await db
      .select()
      .from(smartContracts)
      .where(
        and(
          eq(smartContracts.contractType, contractType),
          eq(smartContracts.chainId, chainId),
          eq(smartContracts.isActive, true)
        )
      );

    if (!contractData) {
      throw new Error(`Contract ${contractType} not found on chain ${chainId}`);
    }

    const provider = this.getProvider(chainId);
    const contract = new ethers.Contract(
      contractData.contractAddress,
      contractData.abi as any[],
      provider
    );

    this.contracts.set(key, contract);
    return contract;
  }

  /**
   * Verify wallet signature (Sign-in with Ethereum)
   */
  async verifyWalletSignature(
    walletAddress: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Link wallet to user account
   */
  async linkWallet(
    userId: number,
    walletAddress: string,
    chainId: number,
    signature: string,
    nonce: string
  ): Promise<void> {
    // Verify signature
    const message = `Sign this message to link your wallet to BondAI.\n\nNonce: ${nonce}`;
    const isValid = await this.verifyWalletSignature(walletAddress, message, signature);
    
    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // Check if wallet already linked
    const existing = await db
      .select()
      .from(web3Wallets)
      .where(
        and(
          eq(web3Wallets.walletAddress, walletAddress.toLowerCase()),
          eq(web3Wallets.chainId, chainId)
        )
      );

    if (existing.length > 0 && existing[0].userId !== userId) {
      throw new Error('Wallet already linked to another account');
    }

    // Insert or update wallet
    await db.insert(web3Wallets).values({
      userId,
      walletAddress: walletAddress.toLowerCase(),
      chainId,
      isPrimary: false,
      verifiedAt: new Date(),
      signature,
      nonce,
    }).onConflictDoUpdate({
      target: [web3Wallets.walletAddress, web3Wallets.chainId],
      set: {
        verifiedAt: new Date(),
        signature,
        nonce,
      },
    });
  }

  /**
   * Get token balance from blockchain
   */
  async getTokenBalance(
    walletAddress: string,
    tokenAddress: string,
    chainId: number = DEFAULT_CHAIN.chainId
  ): Promise<string> {
    const provider = this.getProvider(chainId);
    
    // ERC-20 ABI for balanceOf
    const abi = ['function balanceOf(address) view returns (uint256)'];
    const contract = new ethers.Contract(tokenAddress, abi, provider);
    
    const balance = await contract.balanceOf(walletAddress);
    return ethers.formatEther(balance);
  }

  /**
   * Sync token balance to database
   */
  async syncTokenBalance(
    userId: number,
    walletAddress: string,
    tokenAddress: string,
    tokenSymbol: string,
    chainId: number = DEFAULT_CHAIN.chainId
  ): Promise<void> {
    const balance = await this.getTokenBalance(walletAddress, tokenAddress, chainId);
    
    await db.insert(tokenBalances).values({
      userId,
      walletAddress: walletAddress.toLowerCase(),
      tokenAddress: tokenAddress.toLowerCase(),
      tokenSymbol,
      chainId,
      balance,
      lastSyncedAt: new Date(),
    }).onConflictDoUpdate({
      target: [tokenBalances.walletAddress, tokenBalances.tokenAddress, tokenBalances.chainId],
      set: {
        balance,
        lastSyncedAt: new Date(),
      },
    });
  }

  /**
   * Check if user meets token gate requirement
   */
  async checkTokenGate(userId: number, tokenAddress: string, minimumBalance: string, chainId: number): Promise<boolean> {
    const [balance] = await db
      .select()
      .from(tokenBalances)
      .where(
        and(
          eq(tokenBalances.userId, userId),
          eq(tokenBalances.tokenAddress, tokenAddress.toLowerCase()),
          eq(tokenBalances.chainId, chainId)
        )
      );

    if (!balance) {
      return false;
    }

    return parseFloat(balance.balance) >= parseFloat(minimumBalance);
  }

  /**
   * Track blockchain transaction
   */
  async trackTransaction(
    userId: number | null,
    txHash: string,
    chainId: number,
    fromAddress: string,
    toAddress: string,
    value: string,
    entityType?: string,
    entityId?: number,
    metadata?: any
  ): Promise<void> {
    await db.insert(blockchainTransactions).values({
      userId,
      txHash,
      chainId,
      fromAddress: fromAddress.toLowerCase(),
      toAddress: toAddress.toLowerCase(),
      value,
      status: 'pending',
      entityType,
      entityId,
      metadata,
    });
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    txHash: string,
    chainId: number,
    status: 'confirmed' | 'failed',
    blockNumber?: number,
    gasUsed?: number,
    errorMessage?: string
  ): Promise<void> {
    await db.update(blockchainTransactions)
      .set({
        status,
        blockNumber,
        gasUsed,
        errorMessage,
        confirmedAt: status === 'confirmed' ? new Date() : undefined,
      })
      .where(
        and(
          eq(blockchainTransactions.txHash, txHash),
          eq(blockchainTransactions.chainId, chainId)
        )
      );
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    txHash: string,
    chainId: number = DEFAULT_CHAIN.chainId,
    confirmations: number = 1
  ): Promise<ethers.TransactionReceipt> {
    const provider = this.getProvider(chainId);
    const receipt = await provider.waitForTransaction(txHash, confirmations);
    
    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }

    // Update transaction status
    await this.updateTransactionStatus(
      txHash,
      chainId,
      receipt.status === 1 ? 'confirmed' : 'failed',
      receipt.blockNumber,
      Number(receipt.gasUsed)
    );

    return receipt;
  }

  /**
   * Get current gas price
   */
  async getGasPrice(chainId: number = DEFAULT_CHAIN.chainId): Promise<bigint> {
    const provider = this.getProvider(chainId);
    const feeData = await provider.getFeeData();
    return feeData.gasPrice || BigInt(0);
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(
    to: string,
    data: string,
    chainId: number = DEFAULT_CHAIN.chainId
  ): Promise<bigint> {
    const provider = this.getProvider(chainId);
    return await provider.estimateGas({ to, data });
  }

  /**
   * Get block number
   */
  async getBlockNumber(chainId: number = DEFAULT_CHAIN.chainId): Promise<number> {
    const provider = this.getProvider(chainId);
    return await provider.getBlockNumber();
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(txHash: string, chainId: number = DEFAULT_CHAIN.chainId): Promise<ethers.TransactionResponse | null> {
    const provider = this.getProvider(chainId);
    return await provider.getTransaction(txHash);
  }

  /**
   * Get chain info
   */
  getChainInfo(chainId: number) {
    return Object.values(SUPPORTED_CHAINS).find(chain => chain.chainId === chainId);
  }

  /**
   * Format address for display
   */
  formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }
}

// Singleton instance
export const web3Service = new Web3Service();
