// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

// 1. `listItem`: List NFTs on the marketplace
// 2. `buyItem`: Buy NFTs from the marketplace
// 3. `cancelItem`: Cancel a listing
// 4. `updateListing`: Update price
// 5. `withdrawProceeds`: Withdraw payment for my bought NFTs

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__PriceNotMet(address nftAddress, uint256 tokenId, uint256 price);
error NftMarketplace__NoProceeds();
error NftMarketplace__TransferFailed();

// https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard-nonReentrant--
contract NftMarketplace is ReentrancyGuard {
    // TYPES
    struct Listing {
        uint256 price;
        address seller;
    }

    // EVENTS
    event ItemListed(address indexed seller, address indexed nftAddress, uint256 indexed tokenId, uint256 price);
    event ItemBought(address indexed buyer, address indexed nftAddress, uint256 indexed tokenId, uint256 price);
    event ItemCanceled(address indexed seller, address indexed nftAddress, uint256 indexed tokenId);

    // NFT Contract address -> NFT Token ID -> Listing
    mapping(address => mapping(uint256 => Listing)) private s_listings;
    // Seller address -> Amount earned
    mapping(address => uint256) private s_proceeds;

    /////////////////
    // Modifiers  //
    ///////////////
    modifier notListed(address nftAddress, uint256 tokenId, address owner) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isOwner(address nftAddress, uint256 tokenId, address spender) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (owner != spender) {
            revert NftMarketplace__NotOwner();
        }
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NftMarketplace__NotListed(nftAddress, tokenId);
        }
        _;
    }

    /////////////////////
    // Main Functions //
    ///////////////////

    /**
     * @notice Method for listing your NFT on the marketplace
     * @param nftAddress: Address of the NFT
     * @param tokenId: ID of the NFT
     * @param price: sale price of the listed NFT
     * @dev Technically, we could have the contract be the escrow for the NFTs,
     * but this way people can still hold their NFTS when listed
     */
    function listItem(address nftAddress, uint256 tokenId, uint256 price)
        external
        notListed(nftAddress, tokenId, msg.sender)
        isOwner(nftAddress, tokenId, msg.sender)
    // Challenge: Have this contract accept payment in a subset of tokens
    // Hint: Use Chainlink Price Feeds to convert the price of the tokens between eachother
    {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForMarketplace();
        }
        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    /**
     * @notice Method for buying an NFT on the marketplace
     * @param nftAddress: Address of the NFT
     * @param tokenId: ID of the NFT
     * @dev "isListed" modifier ensures the NFT is listed for sale
     * @dev "nonReentrant" modifier prevents this function from being called again while it is still executing the first call
     */
    function buyItem(address nftAddress, uint256 tokenId) external payable nonReentrant isListed(nftAddress, tokenId) {
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if (msg.value < listedItem.price) {
            revert NftMarketplace__PriceNotMet(nftAddress, tokenId, listedItem.price);
        }
        // Why don't we just send the seller the money?
        // because the send could fail -> https://fravoll.github.io/solidity-patterns/pull_over_push.html
        s_proceeds[listedItem.seller] = s_proceeds[listedItem.seller] + msg.value;
        // be sure to update state like this before transferring the nft to guard against reentrancy attacks
        delete (s_listings[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(listedItem.seller, msg.sender, tokenId);
        // check to make sure NFT was transferred
        emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price);
    }

    /**
     * @notice Method for cancelling a listing an NFT on the marketplace
     * @param nftAddress: Address of the NFT
     * @param tokenId: ID of the NFT
     * @dev "isOwner" modifier ensures msg.sender owns the NFT
     * @dev "isListed" modifier ensures the NFT is listed for sale
     */
    function cancelListing(address nftAddress, uint256 tokenId)
        external
        isOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }

    /**
     * @notice Method for updating a listing an NFT on the marketplace
     * @param nftAddress: Address of the NFT
     * @param tokenId: ID of the NFT
     * @dev "isOwner" modifier ensures msg.sender owns the NFT
     * @dev "isListed" modifier ensures the NFT is listed for sale
     */
    function updateListing(address nftAddress, uint256 tokenId, uint256 newPrice)
        external
        isListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ItemListed(msg.sender, nftAddress, tokenId, newPrice);
    }

    /**
     * @notice Method to allow sellers to withdraw proceeds from sales
     * @dev msg.sender must have proceeds to withdraw
     */
    function withdrawProceeds() external {
        uint256 proceeds = s_proceeds[msg.sender]; // temp var to hold how much ETH to send to msg.sender
        if (proceeds <= 0) {
            revert NftMarketplace__NoProceeds();
        }
        s_proceeds[msg.sender] = 0; // update state of contract before sending ETH!
        (bool success,) = payable(msg.sender).call{value: proceeds}("");
        if (!success) {
            revert NftMarketplace__TransferFailed();
        }
    }

    ///////////////////////
    // Getter Functions //
    ////////////////////

    function getListing(address nftAddress, uint256 tokenId) external view returns (Listing memory) {
        return s_listings[nftAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }
}
