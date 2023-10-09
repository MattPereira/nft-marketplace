// HH ethers docs -> https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-ethers
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { assert, expect } = require("chai");

/**
 * @note user must nftContract.approve(marketplaceAddress, tokenId) before the marketplace can list the nft
 */
!developmentChains.includes(network.name) // only run unit tests on local development networks
  ? describe.skip
  : describe("NftMarketplace Tests", function () {
      // outermost scope variables so all the tests can access
      let nftMarketplace, basicNft, deployer, collector;
      const PRICE = ethers.parseEther("1.0");
      const TOKEN_ID = 0;
      const UNLISTED_TOKEN_ID = 1;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer; // returns address only
        collector = await ethers.getSigner((await getNamedAccounts()).collector); // returns collector as signer
        await deployments.fixture(["all"]); // fixtures are declared at bottom of deploy scripts
        nftMarketplace = await ethers.getContract("NftMarketplace", deployer);
        basicNft = await ethers.getContract("BasicNft", deployer);
        await basicNft.mintNft();
        await basicNft.mintNft();
        await basicNft.approve(nftMarketplace.target, TOKEN_ID); // deployer approves nftMarketplace to transfer nft
      });

      describe("listItem()", function () {
        it("Should prevent user from listing nft with price of 0", async function () {
          await expect(nftMarketplace.listItem(basicNft.target, TOKEN_ID, 0)).to.be.revertedWithCustomError(
            nftMarketplace,
            "NftMarketplace__PriceMustBeAboveZero",
          );
        });
        it("Should revert if user has not approved nftMarketplace to transfer nft", async function () {
          // calling approve on the zero address is how to revoke approval
          await basicNft.approve(ethers.ZeroAddress, TOKEN_ID);
          await expect(nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)).to.be.revertedWithCustomError(
            nftMarketplace,
            "NftMarketplace__NotApprovedForMarketplace",
          );
        });
        it("Should prevent user from listing nft that has already been listed", async function () {
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          await expect(nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)).to.be.revertedWithCustomError(
            nftMarketplace,
            "NftMarketplace__AlreadyListed",
          );
        });
        it("Should add nft to s_listings with the correct asking price", async function () {
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID);
          assert.equal(listing.price, PRICE);
          assert.equal(listing.seller, deployer);
        });
        it("Should emit ItemListed event with proper args", async function () {
          await expect(nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE))
            .to.emit(nftMarketplace, "ItemListed")
            .withArgs(deployer, basicNft.target, TOKEN_ID, PRICE);
        });
      });

      describe("buyItem()", function () {
        describe("when item is not listed for sale", function () {
          it("Should revert if user tries to buy unlisted nft", async function () {
            await expect(nftMarketplace.buyItem(basicNft.target, TOKEN_ID)).to.be.revertedWithCustomError(
              nftMarketplace,
              "NftMarketplace__NotListed",
            );
          });
        });
        describe("when NFT is listed", function () {
          beforeEach(async function () {
            await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          });
          it("Should revert if user tries to buy an item with a price that is too low", async function () {
            await expect(
              nftMarketplace.connect(collector).buyItem(basicNft.target, TOKEN_ID),
            ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__PriceNotMet");
          });

          describe("when buyer has paid the asking price", function () {
            let purchase;
            beforeEach(async function () {
              purchase = await nftMarketplace.connect(collector).buyItem(basicNft.target, TOKEN_ID, { value: PRICE });
            });
            it("Should update s_proceeds for the seller", async function () {
              const proceeds = await nftMarketplace.getProceeds(deployer);
              assert.equal(proceeds, PRICE);
            });
            it("Should update remove the listing from s_listings", async function () {
              const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID);
              assert.equal(listing.seller, ethers.ZeroAddress);
              assert.equal(listing.price, 0n);
            });
            it("Should transfer nft to the buyer", async function () {
              const newOwner = await basicNft.ownerOf(TOKEN_ID);
              assert.equal(newOwner, collector.address);
            });
            it("Should emit the ItemBought event", async function () {
              expect(purchase)
                .to.emit(nftMarketplace, "ItemBought")
                .withArgs(collector.address, basicNft.target, TOKEN_ID, PRICE);
            });
          });
        });
      });

      describe("cancelListing()", function () {
        beforeEach(async function () {
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
        });
        it("Should revert if user who is not owner of nft tries to cancel listing", async function () {
          await expect(
            nftMarketplace.connect(collector).cancelListing(basicNft.target, TOKEN_ID),
          ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner");
        });
        it("Should revert if user tries to cancel listing for nft that is not listed", async function () {
          await expect(nftMarketplace.cancelListing(basicNft.target, UNLISTED_TOKEN_ID)).to.be.revertedWithCustomError(
            nftMarketplace,
            "NftMarketplace__NotListed",
          );
        });
        it("Should remove the listing from s_listings", async function () {
          await nftMarketplace.cancelListing(basicNft.target, TOKEN_ID);
          const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID);
          assert.equal(listing.seller, ethers.ZeroAddress);
          assert.equal(listing.price, 0n);
        });
        it("Should emit ItemCanceled event with proper args", async function () {
          await expect(nftMarketplace.cancelListing(basicNft.target, TOKEN_ID))
            .to.emit(nftMarketplace, "ItemCanceled")
            .withArgs(deployer, basicNft.target, TOKEN_ID);
        });
      });

      describe("updateListing()", function () {
        const UPDATE_PRICE = ethers.parseEther("2.0");
        beforeEach(async function () {
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
        });
        it("Should revert if user who is not owner of nft tries to update listing", async function () {
          await expect(
            nftMarketplace.connect(collector).updateListing(basicNft.target, TOKEN_ID, UPDATE_PRICE),
          ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner");
        });
        it("Should revert if user tries to upst listing for nft that is not listed", async function () {
          await expect(
            nftMarketplace.updateListing(basicNft.target, UNLISTED_TOKEN_ID, UPDATE_PRICE),
          ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed");
        });
        it("Should update the listing price", async function () {
          await nftMarketplace.updateListing(basicNft.target, TOKEN_ID, UPDATE_PRICE);
          const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID);
          assert.equal(listing.seller, deployer);
          assert.equal(listing.price, UPDATE_PRICE);
        });
        it("Should emit ItemListed event with proper args", async function () {
          await expect(nftMarketplace.updateListing(basicNft.target, TOKEN_ID, UPDATE_PRICE))
            .to.emit(nftMarketplace, "ItemListed")
            .withArgs(deployer, basicNft.target, TOKEN_ID, UPDATE_PRICE);
        });
      });

      describe("withdrawProceeds()", function () {
        beforeEach(async function () {
          await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
          await nftMarketplace.connect(collector).buyItem(basicNft.target, TOKEN_ID, {
            value: PRICE,
          });
        });
        // WHY WONT THIS TEST WORK?!?!
        it("Should revert if msg.sender has no proceeds", async function () {
          await expect(nftMarketplace.connect(collector).withdrawProceeds()).to.be.revertedWithCustomError(
            nftMarketplace,
            "NftMarketplace__NoProceeds",
          );
        });
        it("Should allow seller to withdraw their proceeds", async function () {
          const initialBalance = await ethers.provider.getBalance(deployer);
          const tx = await nftMarketplace.withdrawProceeds();
          const receipt = await tx.wait();
          const gasUsed = receipt.gasUsed * tx.gasPrice;
          const finalBalance = await ethers.provider.getBalance(deployer);
          assert.equal(finalBalance, initialBalance + PRICE - gasUsed);
        });
      });
    });
