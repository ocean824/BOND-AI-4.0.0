// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IStakingVault {
    function lockForAuction(address user, bytes32 auctionId, uint256 amount, uint256 duration) external;
    function unlock(bytes32 lockId) external;
    function availableStake(address user) external view returns (uint256);
}

/**
 * @title BondAuctionRegistry
 * @dev Manages bond auctions with BAI token staking requirements
 * 
 * Features:
 * - Requires minimum BAI stake to participate in auctions
 * - Locks stake per bid to prevent spam
 * - Automatic winner selection on auction close
 * - Refunds losing bids automatically
 * - Integrates with off-chain BondAI platform
 */
contract BondAuctionRegistry is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");
    
    IStakingVault public immutable stakingVault;
    
    // Auction parameters
    uint256 public minimumStakeToParticipate;  // e.g., 1000 BAI
    uint256 public stakePerBid;                // e.g., 100 BAI per bid
    uint256 public defaultAuctionDuration;     // e.g., 7 days
    
    enum AuctionStatus { Active, Completed, Cancelled, Expired }
    
    struct Auction {
        bytes32 id;
        uint256 bondId;              // Off-chain bond ID
        address creator;
        uint256 reservePrice;        // In wei (ETH/MATIC)
        uint256 createdAt;
        uint256 startsAt;
        uint256 endsAt;
        AuctionStatus status;
        bytes32 winningBidId;
        string metadataURI;          // Link to off-chain data
    }
    
    struct Bid {
        bytes32 id;
        bytes32 auctionId;
        address bidder;
        uint256 amount;              // Bid amount in wei
        uint256 stakeLocked;         // BAI stake locked for this bid
        uint256 bidAt;
        bool refunded;
    }
    
    mapping(bytes32 => Auction) public auctions;
    mapping(bytes32 => Bid) public bids;
    mapping(bytes32 => bytes32[]) public auctionBids;  // auctionId => bidIds
    mapping(address => bytes32[]) public userBids;     // user => bidIds
    
    // Events
    event AuctionCreated(
        bytes32 indexed id,
        uint256 indexed bondId,
        address indexed creator,
        uint256 reservePrice,
        uint256 startsAt,
        uint256 endsAt
    );
    event BidPlaced(
        bytes32 indexed bidId,
        bytes32 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint256 stakeLocked
    );
    event AuctionCompleted(bytes32 indexed id, bytes32 indexed winningBidId, address winner, uint256 amount);
    event AuctionCancelled(bytes32 indexed id);
    event AuctionExpired(bytes32 indexed id);
    event BidRefunded(bytes32 indexed bidId, address indexed bidder);
    event ParamsUpdated(uint256 minimumStake, uint256 stakePerBid, uint256 duration);
    
    constructor(
        address vaultAddress,
        address admin,
        uint256 _minimumStakeToParticipate,
        uint256 _stakePerBid,
        uint256 _defaultAuctionDuration
    ) {
        require(vaultAddress != address(0), "Vault address cannot be zero");
        require(admin != address(0), "Admin address cannot be zero");
        
        stakingVault = IStakingVault(vaultAddress);
        minimumStakeToParticipate = _minimumStakeToParticipate;
        stakePerBid = _stakePerBid;
        defaultAuctionDuration = _defaultAuctionDuration;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(PLATFORM_ROLE, admin);
    }
    
    /**
     * @dev Update auction parameters
     */
    function setParams(
        uint256 _minimumStakeToParticipate,
        uint256 _stakePerBid,
        uint256 _defaultAuctionDuration
    ) external onlyRole(ADMIN_ROLE) {
        require(_minimumStakeToParticipate > 0, "Minimum stake must be > 0");
        require(_stakePerBid > 0, "Stake per bid must be > 0");
        require(_defaultAuctionDuration >= 1 days, "Duration too short");
        
        minimumStakeToParticipate = _minimumStakeToParticipate;
        stakePerBid = _stakePerBid;
        defaultAuctionDuration = _defaultAuctionDuration;
        
        emit ParamsUpdated(_minimumStakeToParticipate, _stakePerBid, _defaultAuctionDuration);
    }
    
    /**
     * @dev Create a new auction (called by platform)
     */
    function createAuction(
        uint256 bondId,
        uint256 reservePrice,
        uint256 startsAt,
        uint256 duration,
        string calldata metadataURI
    ) external onlyRole(PLATFORM_ROLE) whenNotPaused returns (bytes32) {
        require(reservePrice > 0, "Reserve price must be > 0");
        require(startsAt >= block.timestamp, "Start time in past");
        require(duration >= 1 days, "Duration too short");
        require(bytes(metadataURI).length > 0, "Metadata URI empty");
        
        bytes32 id = keccak256(abi.encodePacked(bondId, block.timestamp, msg.sender));
        require(auctions[id].id == 0, "Auction ID exists");
        
        uint256 endsAt = startsAt + duration;
        
        Auction memory auction = Auction({
            id: id,
            bondId: bondId,
            creator: msg.sender,
            reservePrice: reservePrice,
            createdAt: block.timestamp,
            startsAt: startsAt,
            endsAt: endsAt,
            status: AuctionStatus.Active,
            winningBidId: bytes32(0),
            metadataURI: metadataURI
        });
        
        auctions[id] = auction;
        
        emit AuctionCreated(id, bondId, msg.sender, reservePrice, startsAt, endsAt);
        return id;
    }
    
    /**
     * @dev Place a bid on an auction
     */
    function placeBid(bytes32 auctionId) external payable nonReentrant whenNotPaused {
        Auction storage auction = auctions[auctionId];
        require(auction.id != 0, "Auction not found");
        require(auction.status == AuctionStatus.Active, "Auction not active");
        require(block.timestamp >= auction.startsAt, "Auction not started");
        require(block.timestamp < auction.endsAt, "Auction ended");
        require(msg.value > 0, "Bid amount must be > 0");
        require(msg.value >= auction.reservePrice, "Bid below reserve price");
        
        // Check staking requirements
        uint256 userStake = stakingVault.availableStake(msg.sender);
        require(userStake >= minimumStakeToParticipate, "Insufficient stake to participate");
        require(userStake >= stakePerBid, "Insufficient stake for bid");
        
        // Create bid
        bytes32 bidId = keccak256(abi.encodePacked(auctionId, msg.sender, block.timestamp));
        require(bids[bidId].id == 0, "Bid ID exists");
        
        // Lock stake for this bid
        stakingVault.lockForAuction(
            msg.sender,
            bidId,
            stakePerBid,
            auction.endsAt - block.timestamp
        );
        
        Bid memory bid = Bid({
            id: bidId,
            auctionId: auctionId,
            bidder: msg.sender,
            amount: msg.value,
            stakeLocked: stakePerBid,
            bidAt: block.timestamp,
            refunded: false
        });
        
        bids[bidId] = bid;
        auctionBids[auctionId].push(bidId);
        userBids[msg.sender].push(bidId);
        
        emit BidPlaced(bidId, auctionId, msg.sender, msg.value, stakePerBid);
    }
    
    /**
     * @dev Complete auction and determine winner (called by platform)
     */
    function completeAuction(bytes32 auctionId) external onlyRole(PLATFORM_ROLE) nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.id != 0, "Auction not found");
        require(auction.status == AuctionStatus.Active, "Auction not active");
        require(block.timestamp >= auction.endsAt, "Auction not ended");
        
        bytes32[] memory bidIds = auctionBids[auctionId];
        
        if (bidIds.length == 0) {
            // No bids - mark as expired
            auction.status = AuctionStatus.Expired;
            emit AuctionExpired(auctionId);
            return;
        }
        
        // Find highest bid
        bytes32 winningBidId;
        uint256 highestAmount = 0;
        
        for (uint256 i = 0; i < bidIds.length; i++) {
            Bid memory bid = bids[bidIds[i]];
            if (bid.amount > highestAmount) {
                highestAmount = bid.amount;
                winningBidId = bid.id;
            }
        }
        
        require(winningBidId != bytes32(0), "No valid bids");
        
        Bid memory winningBid = bids[winningBidId];
        auction.status = AuctionStatus.Completed;
        auction.winningBidId = winningBidId;
        
        // Refund losing bids
        for (uint256 i = 0; i < bidIds.length; i++) {
            if (bidIds[i] != winningBidId) {
                _refundBid(bidIds[i]);
            }
        }
        
        // Unlock winning bid stake (winner keeps their stake)
        stakingVault.unlock(winningBidId);
        
        // Transfer winning bid amount to platform (for settlement)
        // Platform will handle off-chain settlement
        
        emit AuctionCompleted(auctionId, winningBidId, winningBid.bidder, winningBid.amount);
    }
    
    /**
     * @dev Refund a losing bid
     */
    function _refundBid(bytes32 bidId) private {
        Bid storage bid = bids[bidId];
        require(!bid.refunded, "Already refunded");
        
        bid.refunded = true;
        
        // Unlock stake
        stakingVault.unlock(bidId);
        
        // Refund ETH/MATIC
        (bool success, ) = bid.bidder.call{value: bid.amount}("");
        require(success, "Refund failed");
        
        emit BidRefunded(bidId, bid.bidder);
    }
    
    /**
     * @dev Cancel auction (admin only)
     */
    function cancelAuction(bytes32 auctionId) external onlyRole(ADMIN_ROLE) nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.id != 0, "Auction not found");
        require(auction.status == AuctionStatus.Active, "Auction not active");
        
        auction.status = AuctionStatus.Cancelled;
        
        // Refund all bids
        bytes32[] memory bidIds = auctionBids[auctionId];
        for (uint256 i = 0; i < bidIds.length; i++) {
            _refundBid(bidIds[i]);
        }
        
        emit AuctionCancelled(auctionId);
    }
    
    /**
     * @dev Get all bids for an auction
     */
    function getAuctionBids(bytes32 auctionId) external view returns (bytes32[] memory) {
        return auctionBids[auctionId];
    }
    
    /**
     * @dev Get all bids by a user
     */
    function getUserBids(address user) external view returns (bytes32[] memory) {
        return userBids[user];
    }
    
    /**
     * @dev Withdraw platform funds (winning bids)
     */
    function withdrawFunds(address payable recipient, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(recipient != address(0), "Recipient cannot be zero");
        require(amount <= address(this).balance, "Insufficient balance");
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Receive ETH/MATIC for bids
     */
    receive() external payable {}
}
