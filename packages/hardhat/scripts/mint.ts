import { ethers } from "hardhat";

async function mint(): Promise<void> {
  const basicNft = await ethers.getContract("BasicNft");
  console.log("Minting...");

  const mintTx = await basicNft.mintNft();
  const mintTxReceipt = await mintTx.wait();
  const tokenId = mintTxReceipt.events[0].args.tokenId;

  console.log("NFT minted with tokenId: ", tokenId.toString());
  console.log("NFT Address:", basicNft.address);
}

mint()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
