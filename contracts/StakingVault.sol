// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title StakingVault
 * @dev Manages BAI token staking with lock accounting for auctions and listings
 * 
 * Features:
 * - Users stake BAI tokens to participate in auctions
 * - Staked tokens can be locked for specific auctions/listings
 * - Locked tokens cannot be unstaked until released
 * - Supports multiple lock types (auction, listing, premium features)
 */
contract StakingVault is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant AUCTION_ROLE = keccak256("AUCTION_ROLE");
    bytes32 public constant LISTING_ROLE = keccak256("LISTING_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    IERC20 public immutable baiToken;
    
    // Staking tracking
    mapping(address => uint256) public totalStaked;
    mapping(address => uint256) public lockedStake;
    
    // Lock tracking by ID (auction ID, listing ID, etc.)
    mapping(bytes32 => LockInfo) public locks;
    mapping(address => bytes32[]) public userLocks;
    
    struct LockInfo {
        address user;
        uint256 amount;
        LockType lockType;
        uint256 lockedAt;
        uint256 expiresAt;
        bool released;
    }
    
    enum LockType {
        Auction,
        Listing,
        Premium,
        Distribution
    }
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 newTotal);
    event Unstaked(address indexed user, uint256 amount, uint256 newTotal);
    event Locked(address indexed user, bytes32 indexed lockId, LockType lockType, uint256 amount);
    event Unlocked(address indexed user, bytes32 indexed lockId, uint256 amount);
    event LockExpired(bytes32 indexed lockId);
    
    constructor(address tokenAddress, address admin) {
        require(tokenAddress != address(0), "Token address cannot be zero");
        require(admin != address(0), "Admin address cannot be zero");
        
        baiToken = IERC20(tokenAddress);
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }
    
    /**
     * @dev Calculate available (unlocked) stake for a user
     */
    function availableStake(address user) public view returns (uint256) {
        uint256 total = totalStaked[user];
        uint256 locked = lockedStake[user];
        return total > locked ? (total - locked) : 0;
    }
    
    /**
     * @dev Stake BAI tokens
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(baiToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        totalStaked[msg.sender] += amount;
        emit Staked(msg.sender, amount, totalStaked[msg.sender]);
    }
    
    /**
     * @dev Unstake BAI tokens (only available stake)
     */
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(availableStake(msg.sender) >= amount, "Insufficient available stake");
        
        totalStaked[msg.sender] -= amount;
        require(baiToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit Unstaked(msg.sender, amount, totalStaked[msg.sender]);
    }
    
    /**
     * @dev Lock stake for an auction (called by AuctionRegistry)
     */
    function lockForAuction(
        address user,
        bytes32 auctionId,
        uint256 amount,
        uint256 duration
    ) external onlyRole(AUCTION_ROLE) {
        _lock(user, auctionId, amount, LockType.Auction, duration);
    }
    
    /**
     * @dev Lock stake for a listing (called by ListingRegistry)
     */
    function lockForListing(
        address user,
        bytes32 listingId,
        uint256 amount,
        uint256 duration
    ) external onlyRole(LISTING_ROLE) {
        _lock(user, listingId, amount, LockType.Listing, duration);
    }
    
    /**
     * @dev Internal lock function
     */
    function _lock(
        address user,
        bytes32 lockId,
        uint256 amount,
        LockType lockType,
        uint256 duration
    ) private {
        require(amount > 0, "Amount must be greater than 0");
        require(availableStake(user) >= amount, "Insufficient available stake");
        require(locks[lockId].amount == 0, "Lock ID already exists");
        
        lockedStake[user] += amount;
        
        locks[lockId] = LockInfo({
            user: user,
            amount: amount,
            lockType: lockType,
            lockedAt: block.timestamp,
            expiresAt: block.timestamp + duration,
            released: false
        });
        
        userLocks[user].push(lockId);
        
        emit Locked(user, lockId, lockType, amount);
    }
    
    /**
     * @dev Unlock stake (called by authorized contracts)
     */
    function unlock(bytes32 lockId) external {
        LockInfo storage lockInfo = locks[lockId];
        require(lockInfo.amount > 0, "Lock not found");
        require(!lockInfo.released, "Already released");
        
        // Check authorization
        if (lockInfo.lockType == LockType.Auction) {
            require(hasRole(AUCTION_ROLE, msg.sender), "Not authorized");
        } else if (lockInfo.lockType == LockType.Listing) {
            require(hasRole(LISTING_ROLE, msg.sender), "Not authorized");
        } else {
            require(hasRole(ADMIN_ROLE, msg.sender), "Not authorized");
        }
        
        _unlock(lockId);
    }
    
    /**
     * @dev Unlock expired locks (anyone can call)
     */
    function unlockExpired(bytes32 lockId) external {
        LockInfo storage lockInfo = locks[lockId];
        require(lockInfo.amount > 0, "Lock not found");
        require(!lockInfo.released, "Already released");
        require(block.timestamp >= lockInfo.expiresAt, "Lock not expired");
        
        _unlock(lockId);
        emit LockExpired(lockId);
    }
    
    /**
     * @dev Internal unlock function
     */
    function _unlock(bytes32 lockId) private {
        LockInfo storage lockInfo = locks[lockId];
        
        lockedStake[lockInfo.user] -= lockInfo.amount;
        lockInfo.released = true;
        
        emit Unlocked(lockInfo.user, lockId, lockInfo.amount);
    }
    
    /**
     * @dev Get all locks for a user
     */
    function getUserLocks(address user) external view returns (bytes32[] memory) {
        return userLocks[user];
    }
    
    /**
     * @dev Get lock details
     */
    function getLockInfo(bytes32 lockId) external view returns (
        address user,
        uint256 amount,
        LockType lockType,
        uint256 lockedAt,
        uint256 expiresAt,
        bool released
    ) {
        LockInfo memory lockInfo = locks[lockId];
        return (
            lockInfo.user,
            lockInfo.amount,
            lockInfo.lockType,
            lockInfo.lockedAt,
            lockInfo.expiresAt,
            lockInfo.released
        );
    }
    
    /**
     * @dev Get total locked amount for a user
     */
    function getLockedAmount(address user) external view returns (uint256) {
        return lockedStake[user];
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Grant auction role to AuctionRegistry contract
     */
    function grantAuctionRole(address auctionRegistry) external onlyRole(ADMIN_ROLE) {
        grantRole(AUCTION_ROLE, auctionRegistry);
    }
    
    /**
     * @dev Grant listing role to ListingRegistry contract
     */
    function grantListingRole(address listingRegistry) external onlyRole(ADMIN_ROLE) {
        grantRole(LISTING_ROLE, listingRegistry);
    }
}
