import { ethers } from "hardhat";

const PRICE = ethers.utils.parseEther("1");

async function mintAndList(): Promise<void> {
  const nftMarketplace = await ethers.getContract("NftMarketplace");
  const basicNft = await ethers.getContract("BasicNft");
  console.log("Minting...");

  const mintTx = await basicNft.mintNft();
  const mintTxReceipt = await mintTx.wait();
  const tokenId = mintTxReceipt.events[0].args.tokenId;

  console.log("NFT Contract Address", basicNft.address);
  console.log("Minted NFT with tokenId:", tokenId.toString());

  console.log("Approving Nft...");
  const approvalTx = await basicNft.approve(nftMarketplace.address, tokenId);
  await approvalTx.wait(1);

  console.log("Approved ", nftMarketplace.address, " to transfer NFT");

  console.log("Listing NFT...");
  const listTx = await nftMarketplace.listItem(basicNft.address, tokenId, PRICE);
  await listTx.wait(1);

  console.log("NFT Listed on", nftMarketplace.address);
}

mintAndList()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
