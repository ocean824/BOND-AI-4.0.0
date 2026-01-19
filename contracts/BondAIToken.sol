// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title BondAIToken (BAI)
 * @dev Native utility token for the BondAI platform
 * 
 * Token Utility:
 * - Stake to participate in bond auctions
 * - Pay for premium features and analytics
 * - Receive distribution bonuses
 * - Governance voting (future)
 * - Pay third-party processors
 * 
 * Total Supply: 1,000,000,000 BAI (1 billion)
 * Decimals: 18
 */
contract BondAIToken is ERC20, ERC20Burnable, ERC20Snapshot, Ownable, Pausable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    // Token allocation addresses
    address public treasury;
    address public rewardsPool;
    address public teamVesting;
    address public liquidityPool;
    
    // Vesting tracking
    mapping(address => uint256) public vestingStart;
    mapping(address => uint256) public vestingDuration;
    mapping(address => uint256) public vestingReleased;
    
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TokensVested(address indexed beneficiary, uint256 amount);
    event SnapshotCreated(uint256 indexed snapshotId);
    
    constructor(
        address initialOwner,
        address _treasury,
        address _rewardsPool,
        address _teamVesting,
        address _liquidityPool
    ) ERC20("BondAI Token", "BAI") Ownable(initialOwner) {
        require(_treasury != address(0), "Treasury address cannot be zero");
        require(_rewardsPool != address(0), "Rewards pool address cannot be zero");
        require(_teamVesting != address(0), "Team vesting address cannot be zero");
        require(_liquidityPool != address(0), "Liquidity pool address cannot be zero");
        
        treasury = _treasury;
        rewardsPool = _rewardsPool;
        teamVesting = _teamVesting;
        liquidityPool = _liquidityPool;
        
        // Mint initial supply according to tokenomics
        // 40% - Platform Treasury (vested 4 years)
        _mint(_treasury, (MAX_SUPPLY * 40) / 100);
        _setupVesting(_treasury, 4 * 365 days);
        
        // 25% - Investor Rewards (immediate)
        _mint(_rewardsPool, (MAX_SUPPLY * 25) / 100);
        
        // 20% - Team & Advisors (vested 3 years)
        _mint(_teamVesting, (MAX_SUPPLY * 20) / 100);
        _setupVesting(_teamVesting, 3 * 365 days);
        
        // 10% - Liquidity Pools (immediate)
        _mint(_liquidityPool, (MAX_SUPPLY * 10) / 100);
        
        // 5% - Initial Airdrop (to owner for distribution)
        _mint(initialOwner, (MAX_SUPPLY * 5) / 100);
    }
    
    /**
     * @dev Setup vesting schedule for an address
     */
    function _setupVesting(address beneficiary, uint256 duration) private {
        vestingStart[beneficiary] = block.timestamp;
        vestingDuration[beneficiary] = duration;
    }
    
    /**
     * @dev Calculate vested amount for an address
     */
    function vestedAmount(address beneficiary) public view returns (uint256) {
        if (vestingDuration[beneficiary] == 0) {
            return balanceOf(beneficiary);
        }
        
        uint256 elapsed = block.timestamp - vestingStart[beneficiary];
        if (elapsed >= vestingDuration[beneficiary]) {
            return balanceOf(beneficiary) + vestingReleased[beneficiary];
        }
        
        uint256 totalAllocation = balanceOf(beneficiary) + vestingReleased[beneficiary];
        return (totalAllocation * elapsed) / vestingDuration[beneficiary];
    }
    
    /**
     * @dev Release vested tokens
     */
    function releaseVested() external {
        uint256 vested = vestedAmount(msg.sender);
        uint256 released = vestingReleased[msg.sender];
        uint256 releasable = vested - released;
        
        require(releasable > 0, "No tokens to release");
        
        vestingReleased[msg.sender] = vested;
        emit TokensVested(msg.sender, releasable);
    }
    
    /**
     * @dev Override transfer to enforce vesting
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Snapshot) whenNotPaused {
        // Check vesting if transferring from vested address
        if (vestingDuration[from] > 0) {
            uint256 vested = vestedAmount(from);
            uint256 released = vestingReleased[from];
            uint256 available = vested - released;
            require(amount <= available, "Transfer amount exceeds vested tokens");
        }
        
        super._beforeTokenTransfer(from, to, amount);
    }
    
    /**
     * @dev Create a snapshot for governance or distribution calculations
     */
    function snapshot() external onlyOwner returns (uint256) {
        uint256 snapshotId = _snapshot();
        emit SnapshotCreated(snapshotId);
        return snapshotId;
    }
    
    /**
     * @dev Pause token transfers (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Update treasury address
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Treasury address cannot be zero");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
}
