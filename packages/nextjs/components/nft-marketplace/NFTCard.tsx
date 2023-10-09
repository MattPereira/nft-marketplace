import { useEffect, useState } from "react";
import Image from "next/image";
import { formatEther } from "viem";
import { useAccount, useContractRead } from "wagmi";
import { erc721ABI } from "wagmi";
import { Spinner } from "~~/components/assets/Spinner";
import { UpdateListingModal } from "~~/components/nft-marketplace/UpdateListingModal";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

// import { useScaffoldContractRead } from "~~/hooks/scaffold-eth";

interface NFTCardProps {
  seller: string;
  price: bigint;
  tokenId: bigint;
  nftAddress: string;
}

interface Attribute {
  trait_type: string;
  value: number;
}

interface NftMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Attribute[];
}

export const NFTCard = ({ seller, price, tokenId, nftAddress }: NFTCardProps) => {
  const [nftMetadata, setNftMetadata] = useState<NftMetadata | null>(null);
  const { writeAsync } = useScaffoldContractWrite({
    contractName: "NftMarketplace",
    functionName: "buyItem",
    args: [nftAddress, tokenId],
    // For payable functions, expressed in ETH
    value: price,
    // The number of block confirmations to wait for before considering transaction to be confirmed (default : 1).
    blockConfirmations: 1,
    // The callback function to execute when the transaction is confirmed.
    onBlockConfirmation: txnReceipt => {
      console.log("Transaction blockHash", txnReceipt.blockHash);
    },
  });

  const { address } = useAccount();
  const isOwnedByUser = seller === address;

  // used generic useContractRead instead of useScaffoldContractRead to read any NFT address that is listed on nft marketplace contract
  const { data: tokenURI, isLoading: isTokenUriLoading } = useContractRead({
    address: nftAddress,
    abi: erc721ABI,
    functionName: "tokenURI",
    args: [tokenId],
  }) as { data: string; isLoading: boolean };

  useEffect(() => {
    const requestURL = tokenURI?.replace("ipfs://", "https://ipfs.io/ipfs/");

    async function getImage() {
      if (requestURL) {
        try {
          const response = await (await fetch(requestURL)).json();
          if (response.image.startsWith("ipfs://"))
            response.image = response.image.replace("ipfs://", "https://ipfs.io/ipfs/");
          setNftMetadata(response);
        } catch (e) {
          console.log("error", e);
        }
      }
    }

    getImage();
  }, [tokenURI]);

  if (isTokenUriLoading || !nftMetadata)
    return (
      <div className="flex justify-center items-center mt-8">
        <Spinner width="65" height="65" />
      </div>
    );

  const uniqueId = `modal_${nftAddress}_${tokenId}`;

  return (
    <div>
      <div className="card card-compact w-96 bg-base-100 shadow-xl mx-auto">
        <p className="text-end mr-8">{formatEther(price)} ETH</p>

        <figure className="h-72">
          <Image width={300} height={300} src={nftMetadata.image} alt="Shoes" />
        </figure>
        <div className="p-5">
          <h3 className="text-2xl font-bold">
            {nftMetadata.name} #{tokenId.toString()}
          </h3>
          <p>{nftMetadata.description}</p>
          <div className="flex gap-4 mb-4 justify-between">
            Owned by {isOwnedByUser ? "You" : <Address address={seller} />}
          </div>
          <div className="flex justify-between gap-4 mb-4">
            NFT contract <Address address={nftAddress} />{" "}
          </div>
          <div>
            {isOwnedByUser ? (
              <button
                className="btn btn-primary w-full"
                onClick={() => (document?.getElementById(uniqueId) as HTMLDialogElement)?.showModal()}
              >
                Update Listing
              </button>
            ) : (
              <button
                className="btn btn-primary w-full"
                onClick={() => {
                  console.log("PRICe", price);
                  writeAsync();
                }}
              >
                Buy
              </button>
            )}
          </div>
        </div>
      </div>
      <UpdateListingModal id={uniqueId} nftAddress={nftAddress} tokenId={tokenId} />
    </div>
  );
};
