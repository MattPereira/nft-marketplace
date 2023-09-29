const { ethers } = require("hardhat");

const PRICE = ethers.parseEther("1");

async function mintAndList() {
  const nftMarketplace = await ethers.getContract("NftMarketplace");
  const basicNft = await ethers.getContract("BasicNft");
  console.log("Minting...");
  const mintTx = await basicNft.mintNft();
  const mintTxReceipt = await mintTx.wait();
  const tokenId = mintTxReceipt.logs[0].args.tokenId;
  console.log("Approving Nft...");

  const approvalTx = await basicNft.approve(nftMarketplace.target, tokenId);
  await approvalTx.wait(1);
  console.log("Listing NFT...");
  const listTx = await nftMarketplace.listItem(basicNft.target, tokenId, PRICE);
  await listTx.wait(1);
  console.log("NFT Listed!!!");
}

mintAndList()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
