import { useState } from "react";
import type { NextPage } from "next";
import { parseEther } from "viem";
import { useContractWrite } from "wagmi";
import { erc721ABI } from "wagmi";
import { usePublicClient } from "wagmi";
import { AddressInput } from "~~/components/scaffold-eth/Input";
import { InputBase } from "~~/components/scaffold-eth/Input";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

// import { notification } from "~~/utils/scaffold-eth";

/**
 *
 * @dev usePublicCLient() is like ethersjs Provider!
 *
 * can I leverage scaffold-eth "useTransactor" hook to show notification while approve tx is pending?
 *
 */
const SellNFT: NextPage = () => {
  const [address, setAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");

  const publicClient = usePublicClient();

  const { data: NftMarketplace } = useDeployedContractInfo("NftMarketplace");

  const approveTx = useContractWrite({
    address: address,
    abi: erc721ABI,
    functionName: "approve",
    args: [NftMarketplace?.address as string, BigInt(tokenId)],
  });

  const listNftTx = useScaffoldContractWrite({
    contractName: "NftMarketplace",
    functionName: "listItem",
    args: [address, BigInt(tokenId), parseEther(price)],
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const approveHash = await approveTx?.writeAsync();
    await publicClient.waitForTransactionReceipt(approveHash);
    await listNftTx?.writeAsync();
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
