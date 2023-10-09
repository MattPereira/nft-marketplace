import { useState } from "react";
import type { NextPage } from "next";
import { parseEther } from "viem";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { useContractWrite } from "wagmi";
// import { useWaitForTransaction } from "wagmi";
import { erc721ABI } from "wagmi";
import { AddressInput } from "~~/components/scaffold-eth/Input";
import { InputBase } from "~~/components/scaffold-eth/Input";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

const SellNFT: NextPage = () => {
  const [address, setAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");

  const { data: NftMarketplace } = useDeployedContractInfo("NftMarketplace");

  const { write: approve } = useContractWrite({
    address: address,
    abi: erc721ABI,
    functionName: "approve",
    args: [NftMarketplace?.address as string, BigInt(tokenId)],
    onError(error) {
      console.log("error", error);
    },
    onSuccess(data) {
      waitForTxReceipt(data);
    },
  });

  async function waitForTxReceipt(data: any) {
    const txReceipt = await publicClient.waitForTransactionReceipt(data);
    console.log("txReceipt", txReceipt);
    if (txReceipt.status === "success") {
      notification.success("NFT marketplace approved to sell your NFT");
      listItem();
    } else {
      notification.error("Transaction failed");
    }
  }

  const { writeAsync: listItem } = useScaffoldContractWrite({
    contractName: "NftMarketplace",
    functionName: "listItem",
    args: [address, BigInt(tokenId), parseEther(price)],
    // The number of block confirmations to wait for before considering transaction to be confirmed (default : 1).
    blockConfirmations: 1,
    // The callback function to execute when the transaction is confirmed.
    onBlockConfirmation: txnReceipt => {
      console.log("Transaction blockHash", txnReceipt.blockHash);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    approve();
  };

  return (
    <div>
      <h1 className="text-center text-4xl my-8">Listing Page</h1>
      <div className="flex justify-center">
        <form className="w-1/2 p-8 bg-base-100 rounded-xl" onSubmit={handleSubmit}>
          <h3 className="mb-5 text-xl text-center font-bold">Sell Your NFT</h3>
          <div className="mb-3">
            <label className="text-white ml-4">NFT Address</label>
            <AddressInput value={address} onChange={val => setAddress(val)} />
          </div>
          <div className="mb-3">
            <label className="text-white ml-4">Token ID</label>
            <InputBase value={tokenId} onChange={val => setTokenId(val)} />
          </div>
          <div className="mb-3">
            <label className="text-white ml-4">Price</label>
            <InputBase value={price} onChange={val => setPrice(val)} />
          </div>
          <div className="flex justify-end">
            <button className="btn ml-auto" type="submit">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SellNFT;
