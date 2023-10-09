import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
import { Spinner } from "~~/components/assets/Spinner";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { NFTCard } from "~~/pages/NFTCard";

const Home: NextPage = () => {
  const { data: itemListedEvents, isLoading: isItemListedEventsLoading } = useScaffoldEventHistory({
    contractName: "NftMarketplace",
    eventName: "ItemListed",
    fromBlock: 4457727n,
  });

  return (
    <>
      <MetaHeader />
      <div>
        {isItemListedEventsLoading ? (
          <div className="flex justify-center items-center mt-8">
            <Spinner width="65" height="65" />
          </div>
        ) : !itemListedEvents || itemListedEvents.length === 0 ? (
          <p>No NFTs listed</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 pt-10 px-10">
            {itemListedEvents?.map((event: any, index: any) => {
              const { seller, nftAddress, price, tokenId } = event.args;
              return <NFTCard key={index} seller={seller} nftAddress={nftAddress} price={price} tokenId={tokenId} />;
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default Home;
