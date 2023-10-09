import { useState } from "react";
import { parseEther } from "viem";
import { EtherInput } from "~~/components/scaffold-eth/Input/EtherInput";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

interface UpdateListingModalProps {
  nftAddress: string;
  tokenId: bigint;
  id: string;
}

export const UpdateListingModal = ({ nftAddress, tokenId, id }: UpdateListingModalProps) => {
  const [ethAmount, setEthAmount] = useState("");

  const { writeAsync } = useScaffoldContractWrite({
    contractName: "NftMarketplace",
    functionName: "updateListing",
    args: [nftAddress, tokenId, parseEther(ethAmount)],
    // The number of block confirmations to wait for before considering transaction to be confirmed (default : 1).
    blockConfirmations: 1,
    // The callback function to execute when the transaction is confirmed.
    onBlockConfirmation: txnReceipt => {
      console.log("Transaction blockHash", txnReceipt.blockHash);
      window.location.reload();
    },
  });

  return (
    <dialog id={id} className="modal">
      <div className="modal-box">
        <form method="dialog">
          {/* if there is a button in form, it will close the modal */}
          <button className="btn btn-sm btn-circle btn-ghost absolute left-2 top-2">✕</button>
        </form>
        <h3 className="font-bold text-xl mb-5 text-center">Update NFT Listing</h3>
        <form method="dialog">
          <div className="mb-1">
            <label htmlFor="price" className="ml-3">
              New Listing Price
            </label>
          </div>
          <div className="mb-3">
            <EtherInput
              value={ethAmount}
              name="price"
              placeholder="Enter amount in ETH"
              onChange={amount => setEthAmount(amount)}
            />
          </div>
          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={() => writeAsync()} type="submit">
              Submit
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};
