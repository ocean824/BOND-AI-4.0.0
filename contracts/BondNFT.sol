// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title BondNFT
 * @dev NFT representation of bonds on the BondAI platform
 * 
 * Features:
 * - Each bond is represented as a unique NFT
 * - Metadata includes bond details (face value, maturity, risk score)
 * - Transferable ownership
 * - Royalty on secondary sales (future)
 * - Integration with off-chain BondAI platform
 */
contract BondNFT is ERC721, ERC721URIStorage, ERC721Burnable, AccessControl, Pausable {
    using Counters for Counters.Counter;
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");
    
    Counters.Counter private _tokenIdCounter;
    
    // Bond metadata
    struct BondMetadata {
        uint256 bondId;              // Off-chain bond ID
        uint256 faceValue;           // Face value in wei
        uint256 maturityDate;        // Unix timestamp
        uint256 issueDate;           // Unix timestamp
        uint8 riskScore;             // 0-100
        string bondType;             // "judgment", "surety", etc.
        bool isPerfected;
        bool isActive;
    }
    
    mapping(uint256 => BondMetadata) public bondMetadata;
    mapping(uint256 => uint256) public offChainBondIdToTokenId;  // bondId => tokenId
    
    // Events
    event BondMinted(
        uint256 indexed tokenId,
        uint256 indexed bondId,
        address indexed owner,
        uint256 faceValue
    );
    event BondPerfected(uint256 indexed tokenId);
    event BondDeactivated(uint256 indexed tokenId);
    
    constructor(address admin) ERC721("BondAI Bond", "BOND-NFT") {
        require(admin != address(0), "Admin address cannot be zero");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PLATFORM_ROLE, admin);
    }
    
    /**
     * @dev Mint a new bond NFT
     */
    function mintBond(
        address to,
        uint256 bondId,
        uint256 faceValue,
        uint256 maturityDate,
        uint256 issueDate,
        uint8 riskScore,
        string memory bondType,
        string memory tokenURI_
    ) external onlyRole(MINTER_ROLE) whenNotPaused returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(faceValue > 0, "Face value must be > 0");
        require(maturityDate > block.timestamp, "Maturity date in past");
        require(riskScore <= 100, "Risk score must be <= 100");
        require(offChainBondIdToTokenId[bondId] == 0, "Bond already tokenized");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        
        bondMetadata[tokenId] = BondMetadata({
            bondId: bondId,
            faceValue: faceValue,
            maturityDate: maturityDate,
            issueDate: issueDate,
            riskScore: riskScore,
            bondType: bondType,
            isPerfected: false,
            isActive: true
        });
        
        offChainBondIdToTokenId[bondId] = tokenId;
        
        emit BondMinted(tokenId, bondId, to, faceValue);
        
        return tokenId;
    }
    
    /**
     * @dev Mark bond as perfected (legal process complete)
     */
    function perfectBond(uint256 tokenId) external onlyRole(PLATFORM_ROLE) {
        require(_exists(tokenId), "Token does not exist");
        require(!bondMetadata[tokenId].isPerfected, "Already perfected");
        
        bondMetadata[tokenId].isPerfected = true;
        emit BondPerfected(tokenId);
    }
    
    /**
     * @dev Deactivate bond (matured, defaulted, etc.)
     */
    function deactivateBond(uint256 tokenId) external onlyRole(PLATFORM_ROLE) {
        require(_exists(tokenId), "Token does not exist");
        require(bondMetadata[tokenId].isActive, "Already deactivated");
        
        bondMetadata[tokenId].isActive = false;
        emit BondDeactivated(tokenId);
    }
    
    /**
     * @dev Get bond metadata
     */
    function getBondMetadata(uint256 tokenId) external view returns (
        uint256 bondId,
        uint256 faceValue,
        uint256 maturityDate,
        uint256 issueDate,
        uint8 riskScore,
        string memory bondType,
        bool isPerfected,
        bool isActive
    ) {
        require(_exists(tokenId), "Token does not exist");
        BondMetadata memory metadata = bondMetadata[tokenId];
        
        return (
            metadata.bondId,
            metadata.faceValue,
            metadata.maturityDate,
            metadata.issueDate,
            metadata.riskScore,
            metadata.bondType,
            metadata.isPerfected,
            metadata.isActive
        );
    }
    
    /**
     * @dev Get token ID from off-chain bond ID
     */
    function getTokenIdByBondId(uint256 bondId) external view returns (uint256) {
        uint256 tokenId = offChainBondIdToTokenId[bondId];
        require(tokenId != 0 || bondId == 0, "Bond not tokenized");
        return tokenId;
    }
    
    /**
     * @dev Check if bond is matured
     */
    function isBondMatured(uint256 tokenId) external view returns (bool) {
        require(_exists(tokenId), "Token does not exist");
        return block.timestamp >= bondMetadata[tokenId].maturityDate;
    }
    
    /**
     * @dev Get all bonds owned by an address
     */
    function getBondsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);
        
        uint256 index = 0;
        for (uint256 tokenId = 0; tokenId < _tokenIdCounter.current(); tokenId++) {
            if (_exists(tokenId) && ownerOf(tokenId) == owner) {
                tokenIds[index] = tokenId;
                index++;
            }
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Override required functions
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev Pause transfers (emergency only)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause transfers
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Hook to enforce pause
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
}
